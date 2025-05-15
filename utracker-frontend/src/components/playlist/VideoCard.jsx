'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VideoCard({
  video,
  isExpanded,
  onToggleExpand,
  onUpdateStatus,
  onUpdateNote,
  onUpdateTimeSpent,
  onGenerateAiSummary,
  onCopySummaryToNote
}) {
  const router = useRouter();
  const [note, setNote] = useState(video.notes || '');
  const [timeSpent, setTimeSpent] = useState(video.timeSpent || 0);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const noteRef = useRef(null);
  const videoUrl = `https://www.youtube.com/watch?v=${video.ytId}`;

  // Save note changes when user finishes typing
  const [saveTimeout, setSaveTimeout] = useState(null);
  
  useEffect(() => {
    setNote(video.notes || '');
    setTimeSpent(video.timeSpent || 0);
  }, [video]);

  const handleNoteChange = (e) => {
    const newNote = e.target.value;
    setNote(newNote);
    
    // Clear previous timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout to save after user stops typing
    const timeout = setTimeout(() => {
      onUpdateNote(newNote);
    }, 1000);
    
    setSaveTimeout(timeout);
  };

  const handleTimeChange = (e) => {
    const newTime = parseInt(e.target.value, 10) || 0;
    if (newTime >= 0) {
      setTimeSpent(newTime);
      onUpdateTimeSpent(newTime);
    }
  };

  const handleStatusChange = (newStatus) => {
    onUpdateStatus(newStatus);
  };

  const handleGenerateAiSummary = async () => {
    if (isGeneratingSummary) return;
    
    setIsGeneratingSummary(true);
    setSummaryError('');
    
    try {
      const result = await onGenerateAiSummary();
      
      if (!result.success) {
        setSummaryError(result.message);
      }
    } catch (err) {
      setSummaryError('Failed to generate summary. Please try again.');
      console.error('Error generating summary:', err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleCopySummaryToNote = async () => {
    try {
      await onCopySummaryToNote();
      // Note state will be updated via useEffect when video prop changes
    } catch (err) {
      console.error('Error copying summary to note:', err);
    }
  };

  // Navigate to individual video page
  const navigateToVideoPage = (e) => {
    e.stopPropagation(); // Prevent expanding/collapsing card
    router.push(`/video/${video.id}`);
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
      case 'to-watch': return 'To Watch';
      default: return status;
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
      {/* Video Header */}
      <div className="p-4 cursor-pointer border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1" onClick={onToggleExpand}>
            <span className="mr-2">{statusColors.icon}</span>
            <h3 className="font-medium text-gray-800 dark:text-white truncate">{video.title}</h3>
          </div>
          <div className="flex items-center ml-2">
            <button
              onClick={navigateToVideoPage}
              className="mr-2 px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-md text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              View
            </button>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text} mr-2`}>
              {formatStatus(video.status)}
            </span>
            <div onClick={onToggleExpand}>
              <svg
                className={`w-5 h-5 transform transition-transform duration-200 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          {/* Video Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            <a 
              href={videoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              Watch on YouTube
            </a>
            
            <button
              onClick={navigateToVideoPage}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Open Video Page
            </button>
            
            <div className="relative inline-block">
              <select
                className="appearance-none px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                value={video.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="to-watch">To Watch</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Time Spent */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time Spent (minutes)
            </label>
            <input
              type="number"
              min="0"
              value={timeSpent}
              onChange={handleTimeChange}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          {/* Notes */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes
              </label>
              {video.aiSummaryGenerated && (
                <button
                  onClick={handleCopySummaryToNote}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Copy AI Summary
                </button>
              )}
            </div>
            <textarea
              ref={noteRef}
              value={note}
              onChange={handleNoteChange}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md h-28 resize-none dark:bg-gray-700 dark:text-white"
              placeholder="Add your notes here..."
            />
          </div>
          
          {/* AI Summary */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                AI Summary
              </label>
              {!video.aiSummaryGenerated && (
                <button
                  onClick={handleGenerateAiSummary}
                  disabled={isGeneratingSummary}
                  className={`text-xs ${
                    isGeneratingSummary 
                      ? 'text-gray-400 dark:text-gray-500' 
                      : 'text-blue-600 dark:text-blue-400 hover:underline'
                  }`}
                >
                  {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                </button>
              )}
            </div>
            
            {summaryError && (
              <div className="text-sm text-red-600 dark:text-red-400 mb-2">
                {summaryError}
              </div>
            )}
            
            {video.aiSummaryGenerated ? (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {video.aiSummary || 'No summary available'}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-500 dark:text-gray-400 italic">
                No AI summary has been generated yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 