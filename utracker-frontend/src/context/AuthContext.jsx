'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Initialize auth state from localStorage on mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Get user from localStorage
                const storedUser = localStorage.getItem('user');
                const token = localStorage.getItem('token');
                
                if (storedUser && token) {
                    // Set user and axios header
                    setUser(JSON.parse(storedUser));
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    
                    // Try to refresh user data
                    try {
                        const response = await axios.get(`${API_URL}/api/auth/user`);
                        setUser(response.data);
                        localStorage.setItem('user', JSON.stringify(response.data));
                    } catch (error) {
                        // If unauthorized, logout
                        if (axios.isAxiosError(error) && error.response?.status === 401) {
                            logout();
                        }
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                logout();
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (accessToken) => {
        try {
            // Get user info from Google
            const userInfoResponse = await axios.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            const googleUserData = userInfoResponse.data;

            // Send to backend
            const response = await axios.post(`${API_URL}/api/auth/google`, {
                tokenId: accessToken,
                userData: {
                    name: googleUserData.name,
                    email: googleUserData.email,
                    picture: googleUserData.picture
                }
            });
            
            const { token, user } = response.data;
            
            // Save auth data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            // Set axios header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            setUser(user);
            router.push('/dashboard');
            
            return user;
        } catch (error) {
            console.error('Login error:', error.message);
            throw error;
        }
    };

    const logout = () => {
        // Clear all auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Remove auth header
        delete axios.defaults.headers.common['Authorization'];
        
        setUser(null);
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading,
            login, 
            logout,
            isAuthenticated: () => !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
} 