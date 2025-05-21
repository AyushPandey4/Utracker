'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { usePlaylist } from '@/context/PlaylistContext';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function PlaylistHeader({ playlist, onMarkAllComplete, onAddVideo }) {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshPlaylists } = usePlaylist();
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDurations, setShowDurations] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', error: false, count: 0 });
  const [showSyncNotification, setShowSyncNotification] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetNotification, setResetNotification] = useState({ show: false, message: '' });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState(playlist?.category || '');
  const [changingCategory, setChangingCategory] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Debug log - Remove after debugging
  // console.log('Playlist in header:', {
  //   id: playlist.id, 
  //   name: playlist.name,
  //   isCustomPlaylist: playlist.isCustomPlaylist,
  //   ytPlaylistId: playlist.ytPlaylistId
  // });
  
  // Format minutes as hours and minutes
  const formatTimeSpent = (minutes) => {
    if (!minutes) return '0 min';
    
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Calculate total time spent on this playlist
  const getTotalTimeSpent = () => {
    if (!playlist.videos || playlist.videos.length === 0) return 0;
    return playlist.videos.reduce((total, video) => total + (video.timeSpent || 0), 0);
  };
  
  // Count total notes
  const getTotalNotes = () => {
    if (!playlist.videos) return 0;
    return playlist.videos.filter(video => video.notes && video.notes.trim()).length;
  };
  
  const totalTimeSpent = getTotalTimeSpent();
  const totalNotes = getTotalNotes();
  const ytInfo = playlist.ytInfo || {};
  
  // Fetch user's categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const token = localStorage.getItem('token');
        if (!token) return;

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`${API_URL}/api/user/categories`);
        setCategories(response.data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setCategories([]);
        setError('Failed to load categories');
      } finally {
        setLoadingCategories(false);
      }
    };

    if (showCategoryModal) {
      fetchCategories();
    }
  }, [showCategoryModal]);
  
  const handleAddVideo = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!videoUrl.trim()) {
      setError('Video URL is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await onAddVideo(videoUrl);
      
      if (result.success) {
        setVideoUrl('');
        setShowAddVideoModal(false);
      } else {
        setError(result.message || 'Failed to add video');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSyncWithYouTube = async () => {
    if (!playlist.ytPlaylistId) return;
    
    try {
      setSyncStatus({ loading: true, message: 'Syncing with YouTube...', error: false, count: 0 });
      setShowSyncNotification(true);
      
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setSyncStatus({
          loading: false,
          message: 'Authentication required',
          error: true,
          count: 0
        });
        return;
      }
      
      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Call sync API
      const response = await axios.post(`${API_URL}/api/playlist/${playlist.id}/sync`);
      
      if (response.data.newVideosCount > 0) {
        setSyncStatus({
          loading: false,
          message: `${response.data.newVideosCount} new videos added to this playlist`,
          error: false,
          count: response.data.newVideosCount
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setShowSyncNotification(false);
        }, 10000);
        
        // Refresh the page to show the new videos
        window.location.reload();
      } else {
        setSyncStatus({
          loading: false,
          message: 'Playlist is already up to date',
          error: false,
          count: 0
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setShowSyncNotification(false);
        }, 5000);
      }
    } catch (err) {
      console.error('Error syncing with YouTube:', err);
      setSyncStatus({
        loading: false,
        message: err.response?.data?.msg || 'Failed to sync with YouTube',
        error: true,
        count: 0
      });
    }
  };
  
  const handleResetProgress = async () => {
    setShowResetConfirmModal(false);
    setIsResetting(true);
    
    try {
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setResetNotification({
          show: true,
          message: 'Authentication required'
        });
        setIsResetting(false);
        return;
      }
      
      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Call reset API
      const response = await axios.post(`${API_URL}/api/playlist/${playlist.id}/reset`);
      
      if (response.data.success) {
        setResetNotification({
          show: true,
          message: `Progress reset successfully. All ${response.data.videosCount} videos set to "To Watch".`
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setResetNotification({ show: false, message: '' });
        }, 5000);
        
        // Refresh the page to update UI
        window.location.reload();
      }
    } catch (err) {
      console.error('Error resetting playlist progress:', err);
      setResetNotification({
        show: true,
        message: err.response?.data?.msg || 'Failed to reset progress'
      });
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setResetNotification({ show: false, message: '' });
      }, 5000);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCategoryChange = async (category) => {
    if (!category || category === playlist.category) {
      setShowCategoryModal(false);
      return;
    }

    try {
      setChangingCategory(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Debug log to check playlist object
      console.log('Playlist object:', playlist);

      await axios.patch(`${API_URL}/api/playlist/${playlist.id}/category`, {
        category: category
      });

      toast.success('Category updated successfully');
      setShowCategoryModal(false);
      refreshPlaylists();
    } catch (err) {
      console.error('Error updating category:', err);
      setError(err.response?.data?.msg || 'Failed to update category');
    } finally {
      setChangingCategory(false);
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryInput.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setChangingCategory(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // First add the new category
      await axios.post(`${API_URL}/api/user/category`, {
        category: newCategoryInput.trim()
      });

      // Then update the playlist to use this category
      await axios.patch(`${API_URL}/api/playlist/${playlist.id}/category`, {
        category: newCategoryInput.trim()
      });

      toast.success('Category added and updated successfully');
      setShowCategoryModal(false);
      refreshPlaylists();
    } catch (err) {
      console.error('Error adding new category:', err);
      setError(err.response?.data?.msg || 'Failed to add new category');
    } finally {
      setChangingCategory(false);
      setShowNewCategoryInput(false);
      setNewCategoryInput('');
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8">
      {/* Sync Notification */}
      {showSyncNotification && (
        <div className={`mb-4 p-3 rounded-md flex items-center justify-between ${
          syncStatus.error 
            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
            : syncStatus.count > 0
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
        }`}>
          <div className="flex items-center">
            {syncStatus.loading ? (
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : syncStatus.error ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : syncStatus.count > 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{syncStatus.message}</span>
          </div>
          <button 
            onClick={() => setShowSyncNotification(false)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Reset Notification */}
      {resetNotification.show && (
        <div className="mb-4 p-3 rounded-md flex items-center justify-between bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{resetNotification.message}</span>
          </div>
          <button 
            onClick={() => setResetNotification({ show: false, message: '' })}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row justify-between">
        {/* Left side - Title and stats */}
        <div className="mb-4 lg:mb-0">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
            {playlist.name}
          </h1>
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {playlist.category}
              <button
                onClick={() => setShowCategoryModal(true)}
                className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                title="Edit category"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {playlist.totalVideos} videos
            </span>
            {ytInfo.channelTitle && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                • {ytInfo.channelTitle}
              </span>
            )}
            {ytInfo.publishedAt && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                • Published {formatDate(ytInfo.publishedAt)}
              </span>
            )}
          </div>
          
          {ytInfo.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
              {ytInfo.description}
            </p>
          )}
          
          {/* Duration info */}
          {playlist.duration && (
            <div className="mt-4">
              <button 
                onClick={() => setShowDurations(!showDurations)} 
                className="flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Total Duration: {playlist.duration.normal}
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform duration-200 ${showDurations ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showDurations && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estimated Duration at Different Speeds:</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">1x Speed:</span>
                      <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">{playlist.duration.normal}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">1.5x Speed:</span>
                      <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">{playlist.duration.x1_5}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">1.75x Speed:</span>
                      <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">{playlist.duration.x1_75}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">2x Speed:</span>
                      <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">{playlist.duration.x2}</span>
                    </div>
                  </div>
                  
                  {/* Estimated Time Left */}
                  {playlist.estimatedTimeLeft && playlist.estimatedTimeLeft.minutes > 0 && (
                    <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Estimated Time Left:
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">1x Speed:</span>
                          <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">{playlist.estimatedTimeLeft.formatted}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">1.5x Speed:</span>
                          <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">{playlist.estimatedTimeLeft.x1_5}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">1.75x Speed:</span>
                          <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">{playlist.estimatedTimeLeft.x1_75}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">2x Speed:</span>
                          <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">{playlist.estimatedTimeLeft.x2}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Right side - Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row items-stretch sm:items-start">
          {/* Only show Add Video button for custom playlists */}
          {playlist.isCustomPlaylist ? (
            <button
              onClick={() => setShowAddVideoModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Add Video
            </button>
          ) : (
            <div className="relative group">
              <button
                disabled
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md text-sm font-medium cursor-not-allowed"
              >
                Add Video
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Videos can only be added to custom playlists
              </div>
            </div>
          )}
          
          {/* Sync button for YouTube playlists */}
          {!playlist.isCustomPlaylist && playlist.ytPlaylistId && (
            <button
              onClick={handleSyncWithYouTube}
              disabled={syncStatus.loading}
              className={`px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors ${
                syncStatus.loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {syncStatus.loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </span>
              ) : 'Sync with YouTube'}
            </button>
          )}
        
        <button
          onClick={onMarkAllComplete}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Mark All as Complete
        </button>
          
          <button
            onClick={() => setShowResetConfirmModal(true)}
            disabled={isResetting}
            className={`px-4 py-2 ${
              isResetting ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'
            } text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center`}
          >
            {isResetting ? (
              <>
                <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Progress
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="bg-gray-50 dark:bg-gray-750 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center bg-white dark:bg-gray-700 px-3 py-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Videos</div>
            <div className="font-semibold text-gray-800 dark:text-white">
              {playlist.completedVideos}/{playlist.totalVideos} completed
            </div>
          </div>
        </div>
        
          <div className="flex items-center bg-white dark:bg-gray-700 px-3 py-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600 dark:text-green-400 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Time Spent</div>
              <div className="font-semibold text-gray-800 dark:text-white">{formatTimeSpent(totalTimeSpent)}</div>
          </div>
        </div>
        
          <div className="flex items-center bg-white dark:bg-gray-700 px-3 py-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Notes</div>
            <div className="font-semibold text-gray-800 dark:text-white">{totalNotes} videos with notes</div>
          </div>
          </div>
          
          <a
            href={playlist.ytPlaylistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center bg-white dark:bg-gray-700 px-3 py-2 rounded-md text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
              <path d="M21.593 7.203a2.506 2.506 0 00-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.404a2.56 2.56 0 00-1.766 1.778c-.413 1.566-.417 4.814-.417 4.814s-.004 3.264.406 4.814c.23.857.905 1.534 1.763 1.765 1.582.43 7.83.437 7.83.437s6.265.007 7.831-.403a2.515 2.515 0 001.767-1.763c.414-1.565.417-4.812.417-4.812s.02-3.265-.407-4.831zM9.996 15.005l.005-6 5.207 3.005-5.212 2.995z" />
            </svg>
            <span className="font-medium">View on YouTube</span>
          </a>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="px-5 py-3">
      <div className="mb-1 flex justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{playlist.progress}%</span>
      </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
        <div
          className={`h-2.5 rounded-full ${
            playlist.progress === 100 ? 'bg-green-600' : 'bg-blue-600'
          }`}
          style={{ width: `${playlist.progress}%` }}
        ></div>
      </div>
      </div>
      
      {/* Add Video Modal */}
      {showAddVideoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative overflow-hidden">
            <button
              onClick={() => setShowAddVideoModal(false)}
              className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add Video to Playlist</h2>
            
            {error && (
              <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleAddVideo}>
              <div className="mb-4">
                <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  YouTube Video URL *
                </label>
                <input
                  type="url"
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full p-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter a YouTube video URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID)
                </p>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddVideoModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </span>
                  ) : 'Add Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative overflow-hidden">
            <button
              onClick={() => setShowResetConfirmModal(false)}
              className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Reset Playlist Progress</h2>
            
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300">
              <p className="mb-2 font-medium">Are you sure you want to reset this playlist?</p>
              <p className="text-sm">This will mark all videos as "To Watch" but will preserve your notes and other data.</p>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetProgress}
                className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600"
              >
                Reset Progress
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Category Change Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Change Category
            </h3>
            
            {error && (
              <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Category
              </label>
              {loadingCategories ? (
                <div className="flex justify-center items-center py-4">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <select
                      value={playlist.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      {categories && categories.length > 0 ? (
                        categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))
                      ) : (
                        <option value="">No categories found</option>
                      )}
                    </select>
                  </div>

                  {!showNewCategoryInput ? (
                    <button
                      onClick={() => setShowNewCategoryInput(true)}
                      className="w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md"
                    >
                      + Add New Category
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="Enter new category name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowNewCategoryInput(false);
                            setNewCategoryInput('');
                          }}
                          className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddNewCategory}
                          disabled={changingCategory || !newCategoryInput.trim()}
                          className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                          {changingCategory ? 'Adding...' : 'Add Category'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 