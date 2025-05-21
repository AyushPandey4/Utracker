'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function NotesSearchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Handle search submit
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery || searchQuery.trim() === '') {
      setError('Please enter a search term');
      return;
    }
    
    try {
      setSearching(true);
      setError('');
      
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Perform search
      const response = await axios.get(`${API_URL}/api/video/search/notes?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data.videos || []);
      
      if (response.data.count === 0) {
        setError('No notes found matching your search');
      }
    } catch (err) {
      console.error('Error searching notes:', err);
      setError('Failed to search notes. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Format duration from ISO 8601 format
  const formatDuration = (isoDuration) => {
    if (!isoDuration) return 'Unknown duration';
    
    // Extract hours and minutes from ISO 8601 duration format
    const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    
    if (!matches) return 'Unknown duration';
    
    const hours = matches[1] ? parseInt(matches[1]) : 0;
    const minutes = matches[2] ? parseInt(matches[2]) : 0;
    const seconds = matches[3] ? parseInt(matches[3]) : 0;
    
    // Format based on length
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Search Your Notes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find content across all your video notes
          </p>
        </div>
        
        {/* Search Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your notes..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {searching ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </span>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Results ({searchResults.length})
            </h3>
            
            <div className="space-y-6">
              {searchResults.map(video => (
                <div key={video.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-48 lg:w-60 bg-gray-200 dark:bg-gray-700">
                      <Link href={`/playlist/${video.playlistId}?video=${video.id}`} className="block">
                        <img 
                          src={video.thumbnail || `https://img.youtube.com/vi/${video.ytId}/mqdefault.jpg`} 
                          alt={video.title}
                          className="w-full h-full object-cover aspect-video"
                        />
                      </Link>
                    </div>
                    
                    <div className="p-4 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div>
                          <Link 
                            href={`/playlist/${video.playlistId}?video=${video.id}`}
                            className="text-lg font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1"
                          >
                            {video.title}
                          </Link>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            From: {video.playlistName}
                            {video.duration && ` • ${formatDuration(video.duration)}`}
                          </p>
                        </div>
                        
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            video.status === 'completed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : video.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : video.status === 'rewatch'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {video.status === 'completed' ? 'Completed' : 
                             video.status === 'in-progress' ? 'In Progress' :
                             video.status === 'rewatch' ? 'Need to Rewatch' : 'To Watch'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 bg-gray-50 dark:bg-gray-750 p-3 rounded-md">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Matched Notes:</h4>
                          <button
                            onClick={(event) => {
                              navigator.clipboard.writeText(video.notes);
                              // Visual feedback for copy
                              const button = event.currentTarget;
                              const originalText = button.innerText;
                              button.innerText = 'Copied!';
                              setTimeout(() => {
                                button.innerText = originalText;
                              }, 1000);
                            }}
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center"
                            title="Copy notes to clipboard"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                          {video.notes}
                        </p>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link 
                          href={`/playlist/${video.playlistId}?video=${video.id}`}
                          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          View Video
                        </Link>
                        <a 
                          href={`https://youtube.com/watch?v=${video.ytId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          YouTube
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 