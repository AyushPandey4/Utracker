'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function PinnedVideosWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pinnedVideos, setPinnedVideos] = useState([]);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  
  useEffect(() => {
    // Fetch pinned videos whenever the component mounts, 
    // the user changes, or the path changes
    fetchPinnedVideos();
  }, [user, pathname]);
  
  const fetchPinnedVideos = async () => {
    try {
      setLoading(true);
      
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }
      
      // Make API request with the token in the header
      const response = await axios.get(`${API_URL}/api/video/pinned`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setPinnedVideos(response.data.videos || []);
      setError(''); // Clear any previous errors
      
    } catch (err) {
      console.error('Error fetching pinned videos:', err);
      
      // More detailed error message based on error type
      if (err.response) {
        // Server responded with an error status code
        if (err.response.status === 401 || err.response.status === 403) {
          setError('Authentication error. Please log in again.');
          // Don't remove token here, let the AuthContext handle auth errors
        } else {
          setError(`Error loading pinned videos. Please try again later.`);
        }
      } else if (err.request) {
        // Request was made but no response received
        setError('No response from server. Please check your connection.');
      } else {
        // Something else caused the error
        setError('Failed to load pinned videos');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Format duration from ISO 8601 format
  const formatDuration = (isoDuration) => {
    if (!isoDuration) return '';
    
    // Parse ISO 8601 duration
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center">
            <span className="mr-2 text-xl">📌</span>
            <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
              Pinned Videos
            </h3>
          </div>
        </div>
        <div className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col items-center">
          <p className="text-red-500 dark:text-red-400 mb-3">{error}</p>
          <button 
            onClick={fetchPinnedVideos}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (pinnedVideos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center">
            <span className="mr-2 text-xl">📌</span>
            <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
              Pinned Videos
            </h3>
          </div>
        </div>
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          <p>No pinned videos yet.</p>
          <p className="text-sm mt-2">Pin important videos from your playlists for quick access.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center">
          <span className="mr-2 text-xl">📌</span>
          <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
            Pinned Videos ({pinnedVideos.length})
          </h3>
        </div>
        <button className="text-amber-600 dark:text-amber-400">
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Video List */}
      {isExpanded && (
        <div className="p-4">
          <div className="space-y-3">
            {pinnedVideos.map(video => (
              <div key={video.id} className="flex items-center bg-amber-50 dark:bg-amber-900/10 rounded-md shadow-sm overflow-hidden">
                <div className="w-24 h-16 relative flex-shrink-0">
                  <img 
                    src={video.thumbnail || `https://img.youtube.com/vi/${video.ytId}/mqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  {video.duration && (
                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                      {formatDuration(video.duration)}
                    </div>
                  )}
                  <div className="absolute top-1 right-1 bg-amber-500 text-white p-0.5 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z"/>
                    </svg>
                  </div>
                </div>

                <div className="flex-1 p-3 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                      {video.title}
                    </h4>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      video.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                        : video.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : video.status === 'rewatch'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {video.status === 'completed' ? 'Completed' : 
                       video.status === 'in-progress' ? 'In Progress' :
                       video.status === 'rewatch' ? 'Rewatch' : 'To Watch'}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-amber-600 dark:text-amber-400">{video.playlistName}</span>
                  </div>

                  <div className="mt-1 flex items-center">
                    <Link 
                      href={`/video/${video.id}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-3"
                    >
                      Go to Video
                    </Link>
                    <a
                      href={`https://youtube.com/watch?v=${video.ytId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Watch on YouTube
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 