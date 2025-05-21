'use client';

import { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function ResourceManager({ videoId, resources, onResourcesUpdate }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'other' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Resource type options
  const resourceTypes = [
    { value: 'github', label: 'GitHub', icon: 'https://github.githubassets.com/favicon.ico' },
    { value: 'docs', label: 'Documentation', icon: '📄' },
    { value: 'notes', label: 'Notes', icon: '📝' },
    { value: 'article', label: 'Article', icon: '📰' },
    { value: 'other', label: 'Other', icon: '🔗' }
  ];

  // Get icon for a resource type
  const getResourceIcon = (type) => {
    const resourceType = resourceTypes.find(t => t.value === type) || resourceTypes[4]; // Default to "other"
    return resourceType.icon;
  };

  // Add a new resource
  const handleAddResource = async () => {
    // Validate inputs
    if (!newResource.title.trim() || !newResource.url.trim()) {
      setError('Title and URL are required');
      return;
    }

    // Check if URL is valid
    try {
      new URL(newResource.url);
    } catch (err) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Add resource
      const response = await axios.post(`${API_URL}/api/video/${videoId}/resources`, {
        title: newResource.title,
        url: newResource.url,
        type: newResource.type
      });

      if (response.data.success) {
        // Update resources in parent component
        onResourcesUpdate(response.data.resources);
        
        // Reset form
        setNewResource({ title: '', url: '', type: 'other' });
        setIsAdding(false);
      } else {
        setError('Failed to add resource');
      }
    } catch (err) {
      console.error('Error adding resource:', err);
      setError(err.response?.data?.msg || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Delete a resource
  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    setLoading(true);

    try {
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Delete resource
      const response = await axios.delete(`${API_URL}/api/video/${videoId}/resources/${resourceId}`);

      if (response.data.success) {
        // Update resources in parent component
        onResourcesUpdate(response.data.resources);
      } else {
        setError('Failed to delete resource');
      }
    } catch (err) {
      console.error('Error deleting resource:', err);
      setError(err.response?.data?.msg || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Format a URL for display (truncate if too long)
  const formatUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    } catch (err) {
      return url;
    }
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Resources & Attachments</h4>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center hover:text-blue-800 dark:hover:text-blue-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Resource
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Add resource form */}
      {isAdding && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={newResource.title}
                onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                placeholder="e.g., Project GitHub"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={newResource.type}
                onChange={(e) => setNewResource({...newResource, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white text-sm"
              >
                {resourceTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
            <input
              type="url"
              value={newResource.url}
              onChange={(e) => setNewResource({...newResource, url: e.target.value})}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white text-sm"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleAddResource}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 rounded-md text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Resource'}
            </button>
          </div>
        </div>
      )}

      {/* Resource list */}
      {resources && resources.length > 0 ? (
        <div className="space-y-2">
          {resources.map(resource => (
            <div key={resource._id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex items-center min-w-0">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center mr-2">
                  {typeof getResourceIcon(resource.type) === 'string' && getResourceIcon(resource.type).startsWith('http') ? (
                    <img src={getResourceIcon(resource.type)} alt={resource.type} className="w-4 h-4" />
                  ) : (
                    <span>{getResourceIcon(resource.type)}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{resource.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{formatUrl(resource.url)}</div>
                </div>
              </div>
              <div className="flex items-center ml-2">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  onClick={() => handleDeleteResource(resource._id)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          No resources added yet. Add links to related resources like GitHub repos, documentation, or notes.
        </div>
      )}
    </div>
  );
} 