import axios from 'axios';
import { Platform } from 'react-native';

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
    baseURL: 'http://84.8.133.235:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

// Add request interceptor to log requests
API.interceptors.request.use(
    (config) => {
        console.log('Making request to:', config.baseURL + config.url);
        console.log('Request data:', config.data);
        return config;
    },
    (error) => {
        console.log('Request error:', error);
        return Promise.reject(error);
    }
);

export default API;