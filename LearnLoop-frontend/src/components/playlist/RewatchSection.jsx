'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RewatchSection({ videos, onUpdateStatus, onTogglePin }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter videos that need rewatching
  const rewatchVideos = videos.filter(video => video.status === 'rewatch');

  if (rewatchVideos.length === 0) {
    return null;
  }

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

  return (
    <div className="mb-8 bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-purple-100 dark:bg-purple-900/40 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center">
          <span className="mr-2 text-xl">🔄</span>
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
            Videos to Rewatch ({rewatchVideos.length})
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
          <div className="space-y-3">
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
                  {video.pinned && (
                    <div className="absolute top-1 right-1 bg-amber-500 text-white p-0.5 rounded">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z"/>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-3 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                      {video.title}
                    </h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onTogglePin(video.id)}
                        className={`text-xs ${video.pinned ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 hover:text-amber-500 dark:hover:text-amber-400'}`}
                        title={video.pinned ? "Unpin video" : "Pin video"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                      <select
                        className="text-xs px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                        value={video.status}
                        onChange={(e) => onUpdateStatus(video.id, e.target.value)}
                      >
                        <option value="rewatch">Need to Rewatch</option>
                        <option value="to-watch">To Watch</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center">
                    <a
                      href={`https://youtube.com/watch?v=${video.ytId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-3"
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