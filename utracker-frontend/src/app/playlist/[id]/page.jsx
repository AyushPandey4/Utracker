'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import PlaylistHeader from '@/components/playlist/PlaylistHeader';
import VideoList from '@/components/playlist/VideoList';
import DraggableVideoList from '@/components/playlist/DraggableVideoList';
import RewatchSection from '@/components/playlist/RewatchSection';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { usePlaylist } from '@/context/PlaylistContext';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { addVideoToPlaylist } = usePlaylist();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const hasRewatchVideos = playlist?.videos.some(video => video.status === 'rewatch') || false;
  const [activeTrackingId, setActiveTrackingId] = useState(null);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

    const fetchPlaylist = async () => {
      try {
        // Make sure we have authentication token
        const token = localStorage.getItem('token');
        if (!token) {
          setError('You must be logged in to view this playlist');
          setLoading(false);
          return;
        }
        
        setLoading(true);
        // Ensure auth header is set
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`${API_URL}/api/playlist/${id}`);
        setPlaylist(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching playlist:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError('You are not authorized to view this playlist. Please log in again.');
        } else {
          setError('Failed to load playlist data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (id && user) {
      fetchPlaylist();
    }
  }, [id, user]);

  const updateVideoStatus = async (videoId, newStatus) => {
    try {
      await axios.patch(`${API_URL}/api/video/${videoId}/status`, { status: newStatus });
      
      // Update local state
      setPlaylist(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          videos: prev.videos.map(video => 
            video.id === videoId ? { ...video, status: newStatus } : video
          )
        };
      });
    } catch (err) {
      console.error('Error updating video status:', err);
    }
  };

  const updateVideoNote = async (videoId, note) => {
    try {
      await axios.patch(`${API_URL}/api/video/${videoId}/note`, { note });
      
      // Update local state
      setPlaylist(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          videos: prev.videos.map(video => 
            video.id === videoId ? { ...video, notes: note } : video
          )
        };
      });
    } catch (err) {
      console.error('Error updating video note:', err);
    }
  };

  const updateTimeSpent = async (videoId, timeSpent) => {
    try {
      await axios.patch(`${API_URL}/api/video/${videoId}/time`, { timeSpent });
      
      // Update local state
      setPlaylist(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          videos: prev.videos.map(video => 
            video.id === videoId ? { ...video, timeSpent } : video
          )
        };
      });
    } catch (err) {
      console.error('Error updating time spent:', err);
    }
  };

  const generateAiSummary = async (videoId) => {
    try {
      const response = await axios.post(`${API_URL}/api/video/${videoId}/generate-summary`);
      
      // Update local state
      setPlaylist(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          videos: prev.videos.map(video => 
            video.id === videoId ? { 
              ...video, 
              aiSummary: response.data.aiSummary,
              aiSummaryGenerated: true
            } : video
          )
        };
      });

      return { success: true, summary: response.data.aiSummary };
    } catch (err) {
      console.error('Error generating AI summary:', err);
      return { 
        success: false, 
        message: err.response?.data?.msg || 'Failed to generate summary' 
      };
    }
  };

  const copySummaryToNote = async (videoId) => {
    try {
      const response = await axios.post(`${API_URL}/api/video/${videoId}/summary-to-note`);
      
      // Update local state
      setPlaylist(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          videos: prev.videos.map(video => 
            video.id === videoId ? { ...video, notes: response.data.notes } : video
          )
        };
      });
      
      return { success: true };
    } catch (err) {
      console.error('Error copying summary to note:', err);
      return { success: false };
    }
  };

  const markAllAsComplete = async () => {
    if (!playlist || !playlist.videos || playlist.videos.length === 0) return;
    
    // Filter only videos that are not already completed
    const videosToUpdate = playlist.videos.filter(v => v.status !== 'completed');
    
    if (videosToUpdate.length === 0) return;
    
    // Update all videos
    try {
      // Create a batch of promises to update all videos in parallel
      const updatePromises = videosToUpdate.map(video => 
        axios.patch(`${API_URL}/api/video/${video.id}/status`, { status: 'completed' })
      );
      
      await Promise.all(updatePromises);
      
      // Update local state
      setPlaylist(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          videos: prev.videos.map(video => ({ ...video, status: 'completed' }))
        };
      });
    } catch (err) {
      console.error('Error marking all videos as complete:', err);
    }
  };

  const handleAddVideo = async (videoUrl) => {
    console.log('handleAddVideo called with:', videoUrl);
    
    try {
      console.log('Calling addVideoToPlaylist with:', id, videoUrl);
      const result = await addVideoToPlaylist(id, videoUrl);
      console.log('addVideoToPlaylist result:', result);
      
      if (result.success) {
        // Refresh playlist data
        await fetchPlaylist();
        return { success: true };
      } else {
        console.error('Error from addVideoToPlaylist:', result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      console.error('Exception in handleAddVideo:', err);
      return { success: false, message: 'Failed to add video' };
    }
  };

  // Handle video time tracking
  const handleStartTracking = async (videoId) => {
    setActiveTrackingId(videoId);
  };

  const handleStopTracking = async (videoId) => {
    if (activeTrackingId === videoId) {
      setActiveTrackingId(null);
    }
  };

  // Update tags for a video
  const handleUpdateTags = async (videoId, newTags) => {
    try {
      // No need to make an API call here as the TagManager already updates tags via API
      // Just update the local state to keep UI in sync
      
      if (!playlist) return;
      
      // Find and update the video in our playlist data
      const updatedVideos = playlist.videos.map(video => {
        if (video.id === videoId) {
          return { ...video, tags: newTags };
        }
        return video;
      });
      
      // Update playlist state
      setPlaylist({
        ...playlist,
        videos: updatedVideos
      });
    } catch (err) {
      console.error('Error updating tags:', err);
    }
  };

  // Handle video pin toggle
  const handleTogglePin = async (videoId) => {
    try {
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication required');
        return;
      }
      
      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Call API to toggle pin status
      const response = await axios.patch(`${API_URL}/api/playlist/${id}/toggle-pin-video/${videoId}`);
      
      if (response.data.success) {
        // Update local state
        setPlaylist(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            videos: prev.videos.map(video => 
              video.id === videoId ? { ...video, pinned: response.data.pinned } : video
            )
          };
        });
      }
    } catch (err) {
      console.error('Error toggling pin status:', err);
    }
  };

  // Handle video reordering
  const handleReorderVideos = async (videoPositions) => {
    try {
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication required');
        return;
      }
      
      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Call API to update positions
      await axios.patch(`${API_URL}/api/playlist/${id}/reorder`, { videoPositions });
      
      // No need to update local state as it's already updated by the DraggableVideoList component
    } catch (err) {
      console.error('Error reordering videos:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto max-w-7xl px-4 py-16">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto max-w-7xl px-4 py-16">
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error</h2>
            <p className="text-gray-700 dark:text-gray-300">{error}</p>
            <button 
              onClick={() => router.push('/dashboard')} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto max-w-7xl px-4 py-16">
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Playlist Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400">The playlist you're looking for doesn't exist or you don't have access to it.</p>
            <button 
              onClick={() => router.push('/dashboard')} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Playlist Header Component */}
        <PlaylistHeader 
          playlist={playlist} 
          onMarkAllComplete={markAllAsComplete} 
          onAddVideo={handleAddVideo}
        />
        
        {/* Tab navigation for videos - only show if there are videos to rewatch */}
        {hasRewatchVideos && (
          <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-3 px-4 text-sm font-medium border-b-2 ${
                activeTab === 'all' 
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              All Videos ({playlist.videos.length})
            </button>
            <button
              onClick={() => setActiveTab('rewatch')}
              className={`py-3 px-4 text-sm font-medium border-b-2 ${
                activeTab === 'rewatch' 
                  ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-500' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              To Rewatch ({playlist.videos.filter(v => v.status === 'rewatch').length})
            </button>
          </div>
        )}
        
        {/* Show content based on active tab */}
        {activeTab === 'rewatch' ? (
          <RewatchSection 
            videos={playlist.videos} 
            onUpdateStatus={updateVideoStatus}
            onTogglePin={handleTogglePin}
          />
        ) : (
          <>
            {/* Note about video ordering - only show for YouTube playlists */}
            {playlist.ytPlaylistId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-700 p-4 mb-6 rounded-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Videos are displayed in the original order set by the playlist creator. 
                      The numbers in the blue circles indicate each video's position.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Custom message for custom playlists */}
            {playlist.isCustomPlaylist && playlist.videos && playlist.videos.length > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-400 dark:border-indigo-700 p-4 mb-6 rounded-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                      This is a custom playlist. You can drag and drop videos to customize their order.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Video List Component - Use DraggableVideoList for custom playlists */}
            {playlist.isCustomPlaylist ? (
              <DraggableVideoList 
                videos={playlist.videos} 
                onUpdateStatus={updateVideoStatus}
                onUpdateNote={updateVideoNote}
                onUpdateTimeSpent={updateTimeSpent}
                onGenerateAiSummary={generateAiSummary}
                onCopySummaryToNote={copySummaryToNote}
                onStartTracking={handleStartTracking}
                onStopTracking={handleStopTracking}
                activeTrackingId={activeTrackingId}
                onTagsUpdate={handleUpdateTags}
                onTogglePin={handleTogglePin}
                onReorder={handleReorderVideos}
                isCustomPlaylist={true}
              />
            ) : (
        <VideoList 
          videos={playlist.videos} 
          onUpdateStatus={updateVideoStatus}
          onUpdateNote={updateVideoNote}
          onUpdateTimeSpent={updateTimeSpent}
          onGenerateAiSummary={generateAiSummary}
          onCopySummaryToNote={copySummaryToNote}
                onStartTracking={handleStartTracking}
                onStopTracking={handleStopTracking}
                activeTrackingId={activeTrackingId}
                onTagsUpdate={handleUpdateTags}
                onTogglePin={handleTogglePin}
        />
            )}
          </>
        )}
      </div>
    </div>
  );
} 