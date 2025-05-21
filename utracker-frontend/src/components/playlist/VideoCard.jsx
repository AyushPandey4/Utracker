'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  EllipsisVerticalIcon, 
  ArrowTopRightOnSquareIcon, 
  ClockIcon, 
  PencilIcon, 
  SparklesIcon 
} from '@heroicons/react/24/outline';
import axios from 'axios';

// Add a spinner icon since SpinnerIcon might not be available in @heroicons
const SpinnerIcon = (props) => (
  <svg 
    className={props.className} 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    ></circle>
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Status colors mapping
function getStatusColor(status) {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'in-progress':
      return 'bg-blue-500';
    case 'rewatch':
      return 'bg-purple-500';
    case 'to-watch':
    default:
      return 'bg-gray-300 dark:bg-gray-600';
  }
}

function getStatusBorderColor(status) {
  switch (status) {
    case 'completed':
      return 'border-l-4 border-l-green-500';
    case 'in-progress':
      return 'border-l-4 border-l-blue-500';
    case 'rewatch':
      return 'border-l-4 border-l-purple-500';
    case 'to-watch':
    default:
      return 'border-l-4 border-l-gray-300 dark:border-l-gray-600';
  }
}

// Dropdown for status changes
function StatusDropdown({ currentStatus, onStatusChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const statuses = [
    { value: 'to-watch', label: 'To Watch' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'rewatch', label: 'Need to Rewatch' }
  ];
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const getStatusLabel = (value) => {
    const status = statuses.find(s => s.value === value);
    return status ? status.label : 'To Watch';
  };
  
  const getStatusColor = (value) => {
    switch (value) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'rewatch':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(currentStatus)} hover:opacity-90 transition-colors`}
      >
        {getStatusLabel(currentStatus)}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
          {statuses.map(status => (
            <button
              key={status.value}
              onClick={() => {
                onStatusChange(status.value);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                currentStatus === status.value ? 'font-medium' : ''
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Time tracking component
function TimeTracker({ videoId, initialTimeSpent, isActive, onStart, onStop, onUpdate }) {
  const [isTracking, setIsTracking] = useState(isActive);
  const [timeSpent, setTimeSpent] = useState(initialTimeSpent || 0);
  const timerRef = useRef(null);
  
  // Update when active state changes
  useEffect(() => {
    setIsTracking(isActive);
  }, [isActive]);
  
  // Start/stop timer when tracking state changes
  useEffect(() => {
    if (isTracking) {
      timerRef.current = setInterval(() => {
        setTimeSpent(prev => prev + 1);
        onUpdate(videoId, timeSpent + 1);
      }, 60000); // Update every minute
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTracking, videoId, onUpdate]);
  
  const handleToggleTracking = () => {
    if (isTracking) {
      onStop(videoId);
    } else {
      onStart(videoId);
    }
  };
  
  return (
    <button
      onClick={handleToggleTracking}
      className={`flex items-center px-3 py-1 rounded-md text-xs font-medium ${
        isTracking
          ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900'
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900'
      } transition-colors`}
    >
      {isTracking ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
          Stop Tracking
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          Start Tracking
        </>
      )}
    </button>
  );
}

// Tag management component
function TagManager({ videoId, initialTags, onTagsUpdate }) {
  const [tags, setTags] = useState(initialTags || []);
  const [newTag, setNewTag] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    setTags(initialTags || []);
  }, [initialTags]);
  
  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    setIsAdding(true);
    setError('');
    
    try {
      // Format tag (remove # if present)
      let formattedTag = newTag.trim();
      if (formattedTag.startsWith('#')) {
        formattedTag = formattedTag.substring(1);
      }
      
      // Skip if tag is empty after formatting
      if (!formattedTag) {
        setNewTag('');
        setIsAdding(false);
        return;
      }
      
      // Skip if tag already exists
      if (tags.includes(formattedTag.toLowerCase())) {
        setNewTag('');
        setIsAdding(false);
        return;
      }
      
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      // Add the tag via API
      const response = await axios.post(
        `${API_URL}/api/video/${videoId}/tags`,
        { tags: [formattedTag] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Update local state with the new tags from server
        setTags(response.data.tags);
        onTagsUpdate(response.data.tags);
        setNewTag('');
      }
    } catch (err) {
      console.error('Error adding tag:', err);
      setError('Failed to add tag');
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleRemoveTag = async (tagToRemove) => {
    try {
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      // Remove the tag via API
      const response = await axios.delete(
        `${API_URL}/api/video/${videoId}/tags`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          data: { tags: [tagToRemove] }
        }
      );
      
      if (response.data.success) {
        // Update local state with the new tags from server
        setTags(response.data.tags);
        onTagsUpdate(response.data.tags);
      }
    } catch (err) {
      console.error('Error removing tag:', err);
      setError('Failed to remove tag');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };
  
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.length === 0 ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">No tags yet</span>
        ) : (
          tags.map(tag => (
            <span 
              key={tag} 
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
            >
              #{tag}
              <button 
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          ))
        )}
      </div>
      
      <div className="flex items-center mt-2">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400 pointer-events-none">
            #
          </span>
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a tag (e.g. important, revision)"
            className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={handleAddTag}
          disabled={isAdding || !newTag.trim()}
          className="ml-2 px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          {isAdding ? (
            <SpinnerIcon className="animate-spin h-4 w-4 text-white" />
          ) : (
            "Add"
          )}
        </button>
      </div>
      
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}

export default function VideoCard({
  video,
  onUpdateStatus,
  onUpdateNote,
  onUpdateTimeSpent,
  onGenerateAiSummary,
  onCopySummaryToNote,
  onTimeUpdate,
  isTimeTracking,
  onStartTracking,
  onStopTracking,
  onTogglePin
}) {
  const router = useRouter();
  const [isPinning, setIsPinning] = useState(false);
  const videoUrl = `https://www.youtube.com/watch?v=${video.ytId}`;

  const handleTogglePin = async () => {
    if (isPinning) return;
    
    try {
      setIsPinning(true);
      await onTogglePin(video.id);
    } catch (err) {
      console.error('Error toggling pin status:', err);
    } finally {
      setIsPinning(false);
    }
  };

  // Get status color and icon
  const getStatusColors = () => {
    switch (video.status) {
      case 'completed':
        return {
          bg: 'bg-green-100 dark:bg-green-900',
          text: 'text-green-800 dark:text-green-200',
          icon: '🟢'
        };
      case 'in-progress':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: '🟡'
        };
      case 'rewatch':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900',
          text: 'text-purple-800 dark:text-purple-200',
          icon: '🔄'
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-800 dark:text-gray-200',
          icon: '⚪️'
        };
    }
  };

  const statusColors = getStatusColors();
  const formatStatus = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'rewatch': return 'Need to Rewatch';
      case 'to-watch': return 'To Watch';
      default: return status;
    }
  };
  
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
  
  const formatViewCount = (viewCount) => {
    if (!viewCount) return '0 views';
    
    if (viewCount < 1000) return `${viewCount} views`;
    if (viewCount < 1000000) return `${(viewCount / 1000).toFixed(1)}K views`;
    return `${(viewCount / 1000000).toFixed(1)}M views`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  const formatTimeSpent = (minutes) => {
    if (!minutes) return '0 min';
    
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  };
  
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg"
      onClick={() => router.push(`/video/${video.id}`)}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="relative flex-shrink-0">
            <img 
              src={video.thumbnail} 
              alt={video.title}
              className="w-40 h-24 object-cover rounded-md"
            />
            <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                {formatDuration(video.duration)}
          </div>
        </div>
        
        {/* Content */}
          <div className="flex-grow min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-grow min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                {video.title}
              </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {video.channelTitle}
              </p>
              </div>
              
              {/* Status and Time */}
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColors().bg} ${getStatusColors().text}`}>
                  {formatStatus(video.status)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatTimeSpent(video.timeSpent)}
                </span>
              </div>
            </div>

            {/* Video Info */}
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
              <span>{formatViewCount(video.viewCount)} views</span>
              <span>•</span>
              <span>{formatDate(video.publishedAt)}</span>
              </div>
              
            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePin();
                }}
                className={`flex items-center text-sm ${
                  video.pinned 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 4.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V4.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                {video.pinned ? 'Pinned' : 'Pin'}
              </button>

            <a 
              href={videoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              Watch on YouTube
            </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 