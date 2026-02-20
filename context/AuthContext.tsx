// context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import API from '@/services/api';
import { router } from 'expo-router';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const checkAuth = async () => {
        console.log('=== AUTH CHECK STARTED ===');
        try {
            const accessToken = await SecureStore.getItemAsync('accessToken');
            const refreshToken = await SecureStore.getItemAsync('refreshToken');

            console.log('Checking auth... Access token exists:', !!accessToken);
            console.log('Refresh token exists:', !!refreshToken);

            // ADD THIS: Log the actual token values (first 20 chars only for security)
            console.log('Access token value:', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
            console.log('Refresh token value:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'null');

            if (!accessToken) {
                console.log('No access token - user not authenticated');
                setIsAuthenticated(false);
                setUser(null);
                setIsLoading(false);
                return;
            }

            // // Validate token and get user profile
            // const response = await API.get('/Auth/profile');
            // setUser(response.data);
            // setIsAuthenticated(true);
// Validate token by fetching user profile
            try {
                console.log('Validating token with backend...');
                const response = await API.get('/Auth/profile');
                console.log('Token valid! User:', response.data.email);
                console.log('User profile fetched:', response.data);
                setUser(response.data);
                setIsAuthenticated(true);
            } catch (profileError: any) {
                console.log('Profile fetch failed, trying to refresh token...');
                console.log('Profile error:', profileError.response?.status, profileError.message);

                // If access token is invalid, try to refresh
                if (refreshToken) {
                    try {
                        console.log('Attempting token refresh with token:', refreshToken.substring(0, 20) + '...');

                        const refreshResponse = await API.post('/Auth/refresh', {
                            //refreshToken
                            refreshToken: refreshToken  // Make sure we're using the variable, not a string
                        });

                        const { accessToken: newAccessToken } = refreshResponse.data;
                        //await SecureStore.setItemAsync('accessToken', newAccessToken);
                        await SecureStore.setItemAsync('accessToken', String(newAccessToken));

                        // Try fetching profile again with new token
                        const retryResponse = await API.get('/Auth/profile');
                        setUser(retryResponse.data);
                        setIsAuthenticated(true);
                        console.log('Token refreshed successfully');
                    } catch (refreshError: any) {
                        console.log('Refresh token failed:', refreshError.response?.status, refreshError.message);
                        console.log('Refresh error details:', refreshError.response?.data);
                        console.log('Refresh token failed:', refreshError);
                        // Refresh failed, clear everything
                        await SecureStore.deleteItemAsync('accessToken');
                        await SecureStore.deleteItemAsync('refreshToken');
                        await SecureStore.deleteItemAsync('rememberMe');
                        setIsAuthenticated(false);
                        setUser(null);
                    }
                } else {
                    console.log('No refresh token available');
                    // No refresh token, clear access token
                    await SecureStore.deleteItemAsync('accessToken');
                    setIsAuthenticated(false);
                    setUser(null);
                }
            }
        } catch (error) {
            console.log('Auth check failed:', error);
            setIsAuthenticated(false);
            setUser(null);

            // Clear invalid tokens
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('rememberMe');

        } finally {
            console.log('=== AUTH CHECK COMPLETED ===');

            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string, rememberMe: boolean) => {
        try {
            const response = await API.post('/Auth/login', {
                email,
                password,
            });

            const { accessToken, refreshToken, user: userData } = response.data;

            console.log('Login successful, remember me:', rememberMe);
            console.log('Access token received:', accessToken);
            console.log('Access token received:', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
            console.log('Refresh token received:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'null');
            console.log('Storing tokens...');
            //
            // if (rememberMe) {
            //     await SecureStore.setItemAsync('accessToken', String(accessToken));
            //     await SecureStore.setItemAsync('refreshToken', String(refreshToken));
            // } else {
            //     // If not "remember me", still store tokens but could implement session-only storage
            //     // For now, we'll store them anyway since SecureStore doesn't have session-only option
            //     await SecureStore.setItemAsync('accessToken', String(accessToken));
            //     await SecureStore.setItemAsync('refreshToken', String(refreshToken));
            // }

            // Ensure tokens are strings
            const accessTokenString = String(accessToken);
            const refreshTokenString = String(refreshToken);

            await SecureStore.setItemAsync('accessToken', accessTokenString);
            await SecureStore.setItemAsync('refreshToken', refreshTokenString);
            // Optionally store the rememberMe preference
            await SecureStore.setItemAsync('rememberMe', rememberMe ? 'true' : 'false');

            console.log('Tokens stored successfully');

            // VERIFY: Read back the tokens immediately to confirm they were saved
            const savedAccessToken = await SecureStore.getItemAsync('accessToken');
            const savedRefreshToken = await SecureStore.getItemAsync('refreshToken');

            console.log('Verification - Access token saved:', savedAccessToken ? savedAccessToken.substring(0, 20) + '...' : 'null');
            console.log('Verification - Refresh token saved:', savedRefreshToken ? savedRefreshToken.substring(0, 20) + '...' : 'null');

            setUser(userData);
            setIsAuthenticated(true);
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');

            if (refreshToken) {
                // Call logout endpoint to revoke refresh token
                await API.post('/Auth/logout', { refreshToken });
            }
        } catch (error) {
            console.log('Logout API error:', error);
        } finally {
            // Clear tokens regardless of API call success
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');

            setUser(null);
            setIsAuthenticated(false);

            router.replace('/auth/login');
        }
    };

    // useEffect(() => {
    //     checkAuth();
    // }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                login,
                logout,
                checkAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};