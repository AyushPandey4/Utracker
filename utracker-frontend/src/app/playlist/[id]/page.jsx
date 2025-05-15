'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import PlaylistHeader from '@/components/playlist/PlaylistHeader';
import VideoList from '@/components/playlist/VideoList';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const router = useRouter();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
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
        />
        
        {/* Video List Component */}
        <VideoList 
          videos={playlist.videos} 
          onUpdateStatus={updateVideoStatus}
          onUpdateNote={updateVideoNote}
          onUpdateTimeSpent={updateTimeSpent}
          onGenerateAiSummary={generateAiSummary}
          onCopySummaryToNote={copySummaryToNote}
        />
      </div>
    </div>
  );
} 