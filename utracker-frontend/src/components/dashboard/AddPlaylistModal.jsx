'use client';

import { useState } from 'react';

export default function AddPlaylistModal({ onClose, onAdd, categories, onAddCategory }) {
  const [name, setName] = useState('');
  const [ytPlaylistUrl, setYtPlaylistUrl] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [urlError, setUrlError] = useState('');

  // Validate YouTube playlist URL format
  const validateYouTubeUrl = (url) => {
    try {
      const urlObj = new URL(url);
      // Most YouTube playlist URLs contain a 'list' parameter
      const hasListParam = urlObj.searchParams.has('list');
      
      const isYouTubeDomain = 
        urlObj.hostname === 'youtube.com' || 
        urlObj.hostname === 'www.youtube.com' || 
        urlObj.hostname === 'youtu.be';
      
      return isYouTubeDomain && hasListParam;
    } catch (err) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset previous errors
    setError('');
    setUrlError('');
    
    // Validate required fields
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!ytPlaylistUrl.trim()) {
      setUrlError('YouTube playlist URL is required');
      return;
    }
    
    // Validate URL format
    if (!validateYouTubeUrl(ytPlaylistUrl)) {
      setUrlError('Please enter a valid YouTube playlist URL (e.g., https://www.youtube.com/playlist?list=PLAYLIST_ID)');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await onAdd({
        name,
        ytPlaylistUrl,
        category: category || 'Uncategorized',
      });
      
      if (!result.success) {
        setError(result.message || 'Failed to add playlist');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      return;
    }
    
    try {
      const result = await onAddCategory(newCategory);
      if (result.success) {
        setCategory(newCategory);
        setNewCategory('');
        setShowAddCategory(false);
      } else {
        setError(result.message || 'Failed to add category');
      }
    } catch (err) {
      setError('Failed to add category');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add New Playlist</h2>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Playlist name"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="ytPlaylistUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              YouTube Playlist URL *
            </label>
            <input
              type="url"
              id="ytPlaylistUrl"
              value={ytPlaylistUrl}
              onChange={(e) => setYtPlaylistUrl(e.target.value)}
              className={`w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                urlError ? 'border-red-500 dark:border-red-700' : 'dark:border-gray-700'
              }`}
              placeholder="https://www.youtube.com/playlist?list=..."
            />
            {urlError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{urlError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The URL must be from a YouTube playlist, containing the 'list=' parameter
            </p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            
            {!showAddCategory ? (
              <div className="flex gap-2">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 p-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 p-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter new category"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </span>
              ) : 'Add Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 