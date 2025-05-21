'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import TagManager from '@/components/playlist/TagManager';
import ResourceManager from '@/components/playlist/ResourceManager';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function VideoPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [noteSaved, setNoteSaved] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [timeSaving, setTimeSaving] = useState(false);
  const [tags, setTags] = useState([]);
  const [isCustomPlaylist, setIsCustomPlaylist] = useState(false);
  const [removingVideo, setRemovingVideo] = useState(false);

  // References for tracking time spent
  const startTimeRef = useRef(null);
  const accumulatedTimeRef = useRef(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Fetch video data
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        // Make sure we have authentication token
        const token = localStorage.getItem('token');
        if (!token) {
          setError('You must be logged in to view this video');
          setLoading(false);
          return;
        }
        
        setLoading(true);
        // Ensure auth header is set
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`${API_URL}/api/video/${id}`);
        
        setVideo(response.data);
        setNote(response.data.notes || '');
        setTimeSpent(response.data.timeSpent || 0);
        accumulatedTimeRef.current = response.data.timeSpent || 0;
        setError(null);
      } catch (err) {
        console.error('Error fetching video:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError('You are not authorized to view this video. Please log in again.');
        } else {
          setError('Failed to load video data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id && user) {
      fetchVideo();
    }
  }, [id, user]);

  // Auto-save notes when they change
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (!noteSaved && video) {
        saveNotes();
      }
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [note, noteSaved]);

  // Timer effect for tracking time spent
  useEffect(() => {
    if (timerActive && !timerInterval) {
      startTimeRef.current = Date.now();
      
      const interval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const totalSeconds = accumulatedTimeRef.current + elapsedSeconds;
        const totalMinutes = Math.floor(totalSeconds / 60);
        setTimeSpent(totalMinutes);
      }, 1000);
      
      setTimerInterval(interval);
    } else if (!timerActive && timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
      
      // Calculate time spent and update accumulated time
      if (startTimeRef.current) {
        const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        accumulatedTimeRef.current += elapsedSeconds;
        
        // Update timeSpent in database
        saveTimeSpent();
      }
    }
    
    // Cleanup timer on component unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        
        // If timer was active, save the time spent
        if (timerActive && startTimeRef.current) {
          const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
          accumulatedTimeRef.current += elapsedSeconds;
          saveTimeSpent();
        }
      }
    };
  }, [timerActive, timerInterval]);

  const saveNotes = async () => {
    if (!video) return;
    
    try {
      await axios.patch(`${API_URL}/api/video/${id}/note`, { note });
      setNoteSaved(true);
    } catch (err) {
      console.error('Error saving notes:', err);
      // We don't set noteSaved to true here so it will retry
    }
  };

  const handleNoteChange = (e) => {
    setNote(e.target.value);
    setNoteSaved(false);
  };

  const saveTimeSpent = async () => {
    if (!video) return;
    
    try {
      setTimeSaving(true);
      const minutesSpent = Math.floor(accumulatedTimeRef.current / 60);
      const response = await axios.patch(`${API_URL}/api/video/${id}/time`, { timeSpent: minutesSpent });
      
      // Update the video state with the new timeSpent
      setVideo(prev => ({
        ...prev,
        timeSpent: minutesSpent
      }));
      
      // Also update the displayed time spent
      setTimeSpent(minutesSpent);
    } catch (err) {
      console.error('Error saving time spent:', err);
    } finally {
      // Set timeout to show "Saved" feedback for a short time
      setTimeout(() => {
        setTimeSaving(false);
      }, 1500);
    }
  };

  const toggleTimer = () => {
    setTimerActive(prev => !prev);
  };

  const updateStatus = async (newStatus) => {
    if (!video) return;
    
    try {
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        router.push('/');
        return;
      }
      
      // Set auth header for this request
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      await axios.patch(
        `${API_URL}/api/video/${id}/status`, 
        { status: newStatus },
        { headers }
      );
      
      setVideo(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating status:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Your session has expired. Please log in again.');
        router.push('/');
      } else {
        setError('Failed to update status. Please try again.');
      }
    }
  };

  const generateSummary = async () => {
    if (!video || isGeneratingSummary) return;
    
    setIsGeneratingSummary(true);
    setSummaryError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/video/${id}/generate-summary`);
      setVideo(prev => ({
        ...prev,
        aiSummary: response.data.aiSummary,
        aiSummaryGenerated: true
      }));
    } catch (err) {
      console.error('Error generating summary:', err);
      setSummaryError(err.response?.data?.msg || 'Failed to generate summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const copySummaryToNotes = async () => {
    if (!video || !video.aiSummaryGenerated) return;
    
    try {
      setCopySuccess(false); // Reset success message
      const response = await axios.post(`${API_URL}/api/video/${id}/summary-to-note`);
      setNote(response.data.notes);
      setVideo(prev => ({
        ...prev,
        notes: response.data.notes
      }));
      setNoteSaved(true);
      setCopySuccess(true); // Show success message
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error copying summary to notes:', err);
    }
  };

  // Format time display (MM:SS or HH:MM:SS)
  const formatTimeDisplay = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format minutes for display (e.g., "2h 30m")
  const formatMinutes = (minutes) => {
    if (!minutes) return '0 min';
    
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '🟢';
      case 'in-progress':
        return '🟡';
      default:
        return '⚪️';
    }
  };

  // Format status text
  const formatStatus = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'to-watch':
        return 'To Watch';
      default:
        return status;
    }
  };

  // Update tags when video data is fetched
  useEffect(() => {
    if (video) {
      setTags(video.tags || []);
    }
  }, [video]);

  const handleTagsUpdate = (newTags) => {
    setTags(newTags);
  };

  const handleResourcesUpdate = async (newResources) => {
    try {
      setVideo(prev => ({
        ...prev,
        resources: newResources
      }));
    } catch (err) {
      console.error('Error updating resources:', err);
    }
  };

  // Update isCustomPlaylist when video data is fetched
  useEffect(() => {
    if (video) {
      setIsCustomPlaylist(video.isCustomPlaylist);
    }
  }, [video]);

  const handleRemoveFromPlaylist = async () => {
    if (!window.confirm('Are you sure you want to remove this video from the playlist?')) {
      return;
    }

    setRemovingVideo(true);
    try {
      const response = await axios.delete(`${API_URL}/api/video/${id}/remove-from-playlist`);
      if (response.data.success) {
        router.push(`/playlist/${video.playlistId}`);
      }
    } catch (err) {
      console.error('Error removing video:', err);
      setError(err.response?.data?.msg || 'Failed to remove video from playlist');
    } finally {
      setRemovingVideo(false);
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

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto max-w-7xl px-4 py-16">
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Video Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400">The video you're looking for doesn't exist or you don't have access to it.</p>
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
        {/* Header with breadcrumb navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => router.push(`/playlist/${video.playlistId}`)}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to {video.playlistName}
              </button>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                {video.title}
              </span>
            </div>
            {isCustomPlaylist && (
              <button
                onClick={handleRemoveFromPlaylist}
                disabled={removingVideo}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center"
              >
                {removingVideo ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Removing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove from Playlist
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full flex items-center ${getStatusColor(video.status)}`}>
              <span className="mr-1">{getStatusIcon(video.status)}</span>
              {formatStatus(video.status)}
            </span>
            
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatMinutes(timeSpent)}
            </span>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {video.title}
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* YouTube Player */}
          <div className="w-full lg:w-2/3">
            <div className="bg-black rounded-lg overflow-hidden aspect-video mb-4">
              {video ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${video.ytId}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-1/3 space-y-4">
            {/* Status Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Status
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus('to-watch')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                    video.status === 'to-watch'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                      : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  To Watch
                </button>
                <button
                  onClick={() => updateStatus('in-progress')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                    video.status === 'in-progress'
                      ? 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                      : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => updateStatus('completed')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                    video.status === 'completed'
                      ? 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => updateStatus('rewatch')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                    video.status === 'rewatch'
                      ? 'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                      : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Need to Rewatch
                </button>
              </div>
            </div>

            {/* Resources Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <ResourceManager 
                videoId={video.id}
                resources={video.resources || []}
                onResourcesUpdate={handleResourcesUpdate}
              />
            </div>

            {/* Time Tracker */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Time Tracker
                </h2>
                <div className="text-xl font-mono">
                  {formatTimeDisplay(Math.floor(accumulatedTimeRef.current) + (timerActive && startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0))}
                </div>
              </div>
              <button
                onClick={toggleTimer}
                className={`w-full py-2 px-4 rounded-md font-medium ${
                  timerActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {timerActive ? 'Stop Timer' : 'Start Timer'}
              </button>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total time spent: {formatMinutes(timeSpent)}
                </p>
                {timeSaving && (
                  <span className="text-xs text-green-500 dark:text-green-400 animate-pulse">
                    Saving time...
                  </span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Notes
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(note);
                      setNoteSaved(true);
                      setTimeout(() => setNoteSaved(false), 2000);
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Copy notes"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {noteSaved ? 'Saved' : 'Saving...'}
                  </span>
                </div>
              </div>
              <textarea
                value={note}
                onChange={handleNoteChange}
                onBlur={saveNotes}
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 min-h-[150px]"
                placeholder="Add your notes here..."
              ></textarea>
            </div>

            {/* AI Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  AI Summary
                </h2>
                {video.aiSummaryGenerated ? (
                  <button
                    onClick={generateSummary}
                    className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    Regenerate Summary
                  </button>
                ) : (
                  <button
                    onClick={generateSummary}
                    disabled={isGeneratingSummary}
                    className={`px-3 py-1 rounded-md text-xs font-medium ${
                      isGeneratingSummary
                        ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                    }`}
                  >
                    {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                  </button>
                )}
              </div>
              
              {summaryError && (
                <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-md">
                  {summaryError}
                </div>
              )}
              
              {copySuccess && (
                <div className="mb-3 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-md flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Summary successfully copied to notes!
                </div>
              )}
              
              {video.aiSummaryGenerated ? (
                <>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap mb-3">
                    {video.aiSummary}
                  </div>
                  
                  <button
                    onClick={copySummaryToNotes}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    Copy Summary to Notes
                  </button>
                </>
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400 text-sm italic">
                  No AI summary has been generated yet. Click the "Generate Summary" button to create one.
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tags</h2>
              <TagManager 
                videoId={video.id} 
                initialTags={tags} 
                onTagsUpdate={handleTagsUpdate} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 