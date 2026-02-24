import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// Determine the base URL based on the platform
const getBaseURL = () => {
    if (Platform.OS === 'android') {
        return 'https://10.0.2.2:7036/api'; // Android emulator
    }
    return 'https://localhost:7036/api'; // iOS simulator
};

const API = axios.create({
    // baseURL: getBaseURL(),
    // baseURL: 'http://10.241.135.93:7036/api',
    //baseURL: 'http://84.8.133.235:5000/api',
    baseURL: 'http://129.151.162.13:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Add request interceptor to log requests
API.interceptors.request.use(
    async (config) => {
        console.log('Making request to:', config.baseURL + config.url);
        console.log('Request data:', config.data);

        const accessToken = await SecureStore.getItemAsync('accessToken');

        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => {
        console.log('Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - Handle token refresh
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is not 401 or request already retried, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            // Queue the request while token is being refreshed
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return API(originalRequest);
                })
                .catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');

            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            // Request new access token
            const response = await axios.post(
                `${API.defaults.baseURL}/Auth/refresh`,
                { refreshToken }
            );

            const { accessToken } = response.data;

            // Store new access token
            await SecureStore.setItemAsync('accessToken', accessToken);

            // Update default header
            API.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;

            processQueue(null, accessToken);

            return API(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError, null);

            // Clear tokens and redirect to login
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');

            // Use replace to prevent going back
            router.replace('/auth/login');

            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default API;