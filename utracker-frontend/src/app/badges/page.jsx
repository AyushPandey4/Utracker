'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function BadgesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState([]);
  const [allPossibleBadges, setAllPossibleBadges] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [checkingBadges, setCheckingBadges] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [badgeCategories, setBadgeCategories] = useState({
    playlists: [],
    milestones: []
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Fetch badges data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get user's earned badges
        const badgesResponse = await axios.get(`${API_URL}/api/badge/my-badges`);
        setBadges(badgesResponse.data || []);
        
        // Get all possible badges
        const allBadgesResponse = await axios.get(`${API_URL}/api/badge/all`);
        setAllPossibleBadges(allBadgesResponse.data || []);
        
        // Categorize badges
        categorizeUserBadges(badgesResponse.data || []);
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  // Categorize badges
  const categorizeUserBadges = (badges) => {
    const playlistBadges = [];
    const milestoneBadges = [];
    
    badges.forEach(badge => {
      if (badge.title.startsWith('Completed: ')) {
        playlistBadges.push(badge);
      } else {
        milestoneBadges.push(badge);
      }
    });
    
    setBadgeCategories({
      playlists: playlistBadges,
      milestones: milestoneBadges
    });
  };

  // Check for new badges
  const checkForNewBadges = async () => {
    try {
      setCheckingBadges(true);
      
      const response = await axios.post(`${API_URL}/api/badge/check-badges`);
      
      if (response.data.newBadges && response.data.newBadges.length > 0) {
        // Update badges list with new ones
        setBadges(response.data.newBadges);
        // Recategorize badges
        categorizeUserBadges(response.data.newBadges);
        
        // Show notification
        setNotification({
          show: true,
          message: response.data.message || 'New badges earned!'
        });
        
        // Hide notification after 5 seconds
        setTimeout(() => {
          setNotification({ show: false, message: '' });
        }, 5000);
      } else {
        setNotification({
          show: true,
          message: 'No new badges earned at this time'
        });
        
        // Hide notification after 5 seconds
        setTimeout(() => {
          setNotification({ show: false, message: '' });
        }, 5000);
      }
    } catch (error) {
      console.error('Error checking for new badges:', error);
    } finally {
      setCheckingBadges(false);
    }
  };

  // Clean up duplicate badges
  const cleanupDuplicateBadges = async () => {
    try {
      setCleaningDuplicates(true);
      
      const response = await axios.post(`${API_URL}/api/badge/cleanup-duplicates`);
      
      // Show notification
      setNotification({
        show: true,
        message: response.data.message || 'Cleaned up duplicate badges'
      });
      
      // Refetch badges after cleanup
      const badgesResponse = await axios.get(`${API_URL}/api/badge/my-badges`);
      setBadges(badgesResponse.data || []);
      categorizeUserBadges(badgesResponse.data || []);
      
      // Hide notification after 5 seconds
      setTimeout(() => {
        setNotification({ show: false, message: '' });
      }, 5000);
      
    } catch (error) {
      console.error('Error cleaning up duplicate badges:', error);
      setNotification({
        show: true,
        message: 'Error cleaning up duplicate badges'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '' });
      }, 5000);
    } finally {
      setCleaningDuplicates(false);
    }
  };

  // Filter badges
  const getFilteredBadges = () => {
    if (!badges.length || !allPossibleBadges.length) return [];
    
    // Create a map of earned badges by title for quick lookup
    const earnedBadgeMap = badges.reduce((map, badge) => {
      map[badge.title] = badge;
      return map;
    }, {});
    
    // Create a complete list with earned and unearned badges
    const allBadges = allPossibleBadges.map(badge => {
      const earnedBadge = earnedBadgeMap[badge.title];
      
      return {
        ...badge,
        earned: !!earnedBadge,
        dateEarned: earnedBadge?.dateEarned,
        id: earnedBadge?.id || `possible-${badge.title.replace(/\s+/g, '-').toLowerCase()}`
      };
    });
    
    // Include the earned playlist badges that aren't in the possible badges list
    const playlistCompletionBadges = badges.filter(badge => 
      badge.title.startsWith('Completed: ') && 
      !allBadges.some(b => b.title === badge.title)
    );
    
    const combinedBadges = [
      ...allBadges,
      ...playlistCompletionBadges.map(badge => ({
        ...badge,
        earned: true,
        isPlaylistBadge: true
      }))
    ];
    
    // Apply the filter
    switch (activeFilter) {
      case 'earned':
        return combinedBadges.filter(badge => badge.earned);
      case 'locked':
        return combinedBadges.filter(badge => !badge.earned);
      case 'playlists':
        return combinedBadges.filter(badge => 
          badge.earned && (badge.isPlaylistBadge || badge.title === 'Playlist Master')
        );
      case 'all':
      default:
        return combinedBadges;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Extract playlist name from title
  const getPlaylistName = (title) => {
    if (title.startsWith('Completed: ')) {
      return title.replace('Completed: ', '');
    }
    return title;
  };

  const filteredBadges = getFilteredBadges();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Your Achievements
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your progress and unlock badges as you complete playlists and videos
          </p>
        </div>

        {/* Filters and Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 text-sm font-medium ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600'
              } ${activeFilter === 'all' ? 'rounded-l-lg' : 'border-l rounded-l-lg'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('earned')}
              className={`px-4 py-2 text-sm font-medium ${
                activeFilter === 'earned'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border-t border-b border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600'
              }`}
            >
              Earned
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('playlists')}
              className={`px-4 py-2 text-sm font-medium ${
                activeFilter === 'playlists'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border-t border-b border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600'
              }`}
            >
              Playlists
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('locked')}
              className={`px-4 py-2 text-sm font-medium ${
                activeFilter === 'locked'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600'
              } ${activeFilter === 'locked' ? 'rounded-r-lg' : 'border-r rounded-r-lg'}`}
            >
              Locked
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={cleanupDuplicateBadges}
              disabled={cleaningDuplicates}
              className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              {cleaningDuplicates ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cleaning...
                </span>
              ) : (
                'Fix Duplicates'
              )}
            </button>
            <button
              onClick={checkForNewBadges}
              disabled={checkingBadges}
              className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              {checkingBadges ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </span>
              ) : (
                'Check for New Badges'
              )}
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification.show && (
          <div className="mb-6 p-4 rounded-md bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
            <p className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
              {notification.message}
            </p>
          </div>
        )}

        {/* Badges Grid */}
        {filteredBadges.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <div className="mb-4 text-6xl">🏆</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Badges Found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {activeFilter === 'earned' 
                ? "You haven't earned any badges yet. Keep learning and completing playlists!"
                : activeFilter === 'playlists'
                ? "You haven't completed any playlists yet."
                : "No badges match the selected filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBadges.map((badge) => {
              const isPlaylistBadge = badge.title.startsWith('Completed: ') || badge.isPlaylistBadge;
              const playlistName = isPlaylistBadge ? getPlaylistName(badge.title) : '';
              
              return (
                <div 
                  key={badge.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border ${
                    isPlaylistBadge 
                      ? 'border-purple-100 dark:border-purple-900'
                      : badge.earned 
                        ? 'border-blue-100 dark:border-blue-900' 
                        : 'border-gray-200 dark:border-gray-700 opacity-75'
                  }`}
                >
                  <div className={`p-4 flex flex-col items-center text-center ${
                    isPlaylistBadge ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20' : ''
                  }`}>
                    <div className={`text-5xl mb-4 ${!badge.earned && 'grayscale'}`}>
                      {badge.iconUrl}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {isPlaylistBadge ? 'Playlist Completed' : badge.title}
                    </h3>
                    {isPlaylistBadge && (
                      <span className="mt-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 text-sm rounded-full">
                        {playlistName}
                      </span>
                    )}
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                      {badge.description}
                    </p>
                    <div className="mt-4 flex items-center">
                      {badge.earned ? (
                        <>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isPlaylistBadge 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Earned
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-3">
                            {formatDate(badge.dateEarned)}
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 