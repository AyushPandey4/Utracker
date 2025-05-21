'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function RewatchWidget() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rewatchVideos, setRewatchVideos] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  
  useEffect(() => {
    fetchRewatchVideos();
  }, []);
  
  const fetchRewatchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get all playlists
      const playlistsResponse = await axios.get(`${API_URL}/api/playlist`);
      const playlists = playlistsResponse.data || [];
      
      // Collect videos with "rewatch" status from all playlists
      let allRewatchVideos = [];
      
      // For each playlist, get full details to access videos
      for (const playlist of playlists) {
        try {
          const playlistResponse = await axios.get(`${API_URL}/api/playlist/${playlist.id}`);
          const playlistData = playlistResponse.data;
          
          // Filter videos with rewatch status and add playlist info
          const rewatchVideos = (playlistData.videos || [])
            .filter(video => video.status === 'rewatch')
            .map(video => ({
              ...video,
              playlistName: playlistData.name,
              playlistId: playlist.id
            }));
          
          allRewatchVideos = [...allRewatchVideos, ...rewatchVideos];
        } catch (err) {
          console.error(`Error fetching playlist ${playlist.id}:`, err);
          // Continue with other playlists even if one fails
          continue;
        }
      }
      
      setRewatchVideos(allRewatchVideos);
    } catch (err) {
      console.error('Error fetching rewatch videos:', err);
      setError('Failed to load rewatch videos');
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
  
  // If no videos to rewatch, don't render the widget
  if (!loading && rewatchVideos.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow-md overflow-hidden mb-8">
      {/* Header */}
      <div className="px-4 py-3 bg-purple-100 dark:bg-purple-900/40 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center">
          <span className="mr-2 text-xl">🔄</span>
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
            Quick Rewatch ({rewatchVideos.length})
          </h3>
        </div>
        <button className="text-purple-700 dark:text-purple-300">
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
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 dark:text-red-400 text-center py-4">
              {error}
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {rewatchVideos.map(video => (
                <div key={video.id} className="flex items-center bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden">
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
                  </div>

                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                          {video.title}
                        </h4>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                          From: {video.playlistName}
                        </p>
                        {video.timeSpent > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Time spent: {formatMinutes(video.timeSpent)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center space-x-2">
                      <Link 
                        href={`/video/${video.id}`}
                        className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/80"
                      >
                        Open Video
                      </Link>
                      <a
                        href={`https://youtube.com/watch?v=${video.ytId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/80"
                      >
                        Watch on YouTube
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 