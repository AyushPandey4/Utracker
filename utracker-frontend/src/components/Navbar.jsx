'use client';

import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
    const [showProfile, setShowProfile] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const { user, loading, login, logout } = useAuth();
    const { darkMode, toggleDarkMode } = useTheme();
    const pathname = usePathname();
    
    // Hide navbar on dashboard pages
    const isDashboard = pathname?.startsWith('/dashboard');
    
    // Define Google login hook at the top level, before any conditionals
    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (response) => {
            try {
                setIsLoggingIn(true);
                await login(response.access_token);
            } catch (error) {
                console.error('Login failed:', error);
                alert('Failed to sign in with Google.');
            } finally {
                setIsLoggingIn(false);
            }
        },
        onError: (error) => {
            console.error('Google Login Failed:', error);
            alert('Google login failed.');
        },
        scope: 'email profile',
    });
    
    // Hide navbar by removing it from DOM 
    useEffect(() => {
        const navbarContainer = document.getElementById('navbar-container');
        if (navbarContainer) {
            if (isDashboard) {
                navbarContainer.style.display = 'none';
                document.body.classList.add('on-dashboard');
            } else {
                navbarContainer.style.display = 'block';
                document.body.classList.remove('on-dashboard');
            }
        }
        
        // Adjust main padding
        const mainElement = document.querySelector('main');
        if (mainElement) {
            if (isDashboard) {
                mainElement.style.paddingTop = '0';
            } else {
                mainElement.style.paddingTop = '4rem'; // 16 in tailwind = 4rem
            }
        }
    }, [pathname, isDashboard]);
    
    // Don't render content if on dashboard
    if (isDashboard) return null;

    const handleSignOut = () => {
        logout();
        setShowProfile(false);
    };
    
    // Helper function to check if a path is active
    const isActivePath = (path) => {
        if (path === '/badges' && pathname?.startsWith('/badges')) {
            return true;
        }
        return pathname === path;
    };

    return (
        <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center space-x-8">
                        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            <Link href="/">Utracker</Link>
                        </h1>
                        
                        {/* Navigation Links - Only show when logged in */}
                        {user && (
                            <div className="hidden md:flex space-x-4">
                                <Link 
                                    href="/dashboard" 
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        isActivePath('/dashboard')
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    Dashboard
                                </Link>
                                <Link 
                                    href="/badges" 
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        isActivePath('/badges')
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    Badges
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Right side buttons */}
                    <div className="flex items-center space-x-4">
                        {/* Dark mode toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                                </svg>
                            )}
                        </button>

                        {/* Authentication buttons */}
                        {loading ? (
                            <div className="animate-spin h-5 w-5 text-blue-500" />
                        ) : !user ? (
                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoggingIn}
                                className="flex items-center px-4 py-2 bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                {isLoggingIn ? "Signing in..." : "Sign in with Google"}
                            </button>
                        ) : (
                            <div className="relative">
                                <button
                                    onClick={() => setShowProfile(!showProfile)}
                                    className="flex items-center"
                                >
                                    <img
                                        src={user.avatar}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full border-2 border-transparent hover:border-blue-500 transition-colors"
                                    />
                                </button>

                                {showProfile && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-200 dark:border-gray-700">
                                        <div className="px-4 py-2">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {user.name}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                        <div className="border-t border-gray-200 dark:border-gray-700">
                                            {/* Mobile nav links */}
                                            <div className="md:hidden">
                                                <Link 
                                                    href="/dashboard" 
                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    onClick={() => setShowProfile(false)}
                                                >
                                                    Dashboard
                                                </Link>
                                                <Link 
                                                    href="/badges" 
                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    onClick={() => setShowProfile(false)}
                                                >
                                                    Badges
                                                </Link>
                                                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                            </div>
                                            <button
                                                onClick={handleSignOut}
                                                className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Sign out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
} 