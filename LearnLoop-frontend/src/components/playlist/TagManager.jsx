'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

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

export default function TagManager({ videoId, initialTags, onTagsUpdate }) {
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