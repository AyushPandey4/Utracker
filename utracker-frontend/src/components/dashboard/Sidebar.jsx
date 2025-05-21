'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';

export default function Sidebar({ 
  categories, 
  activeCategory, 
  setActiveCategory, 
  onAddPlaylistClick,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  badgeCount
}) {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categoryToRename, setCategoryToRename] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [playlistCount, setPlaylistCount] = useState(0);

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    
    if (!newCategory.trim()) {
      setCategoryError('Category name cannot be empty');
      return;
    }
    
    const result = await onAddCategory(newCategory.trim());
    
    if (result.success) {
      setNewCategory('');
      setIsAddingCategory(false);
      setCategoryError('');
    } else {
      setCategoryError(result.message || 'Failed to add category');
    }
  };

  const handleRenameCategory = async (e) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      setCategoryError('New name cannot be empty');
      return;
    }
    
    const result = await onRenameCategory(categoryToRename, newCategoryName.trim());
    
    if (result.success) {
      setNewCategoryName('');
      setCategoryToRename(null);
      setCategoryError('');
    } else {
      setCategoryError(result.message || 'Failed to rename category');
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    const result = await onDeleteCategory(categoryName);
    
    if (!result.success && result.hasPlaylists) {
      setCategoryToDelete(categoryName);
      setPlaylistCount(result.playlistCount);
      setShowDeleteConfirmation(true);
    } else if (result.success) {
      if (result.deletedPlaylistsCount > 0) {
        alert(`Category and ${result.deletedPlaylistsCount} associated playlist(s) were deleted successfully.`);
      } else {
        alert(`Category was deleted successfully.`);
      }
    }
    
    setCategoryMenuOpen(null);
  };

  const confirmDeleteWithPlaylists = async () => {
    if (!categoryToDelete) return;
    
    const result = await onDeleteCategory(categoryToDelete, true);
    
    if (result.success) {
      alert(`Category and ${result.deletedPlaylistsCount} associated playlist(s) were deleted successfully.`);
    } else {
      alert(`Failed to delete category: ${result.message}`);
    }
    
    setShowDeleteConfirmation(false);
    setCategoryToDelete(null);
    setPlaylistCount(0);
  };

  const toggleCategoryMenu = (category) => {
    if (categoryMenuOpen === category) {
      setCategoryMenuOpen(null);
    } else {
      setCategoryMenuOpen(category);
    }
  };

  return (
    <div className="w-full md:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 md:mb-0 flex flex-col">
      {/* Header Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onAddPlaylistClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center justify-center font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Playlist
        </button>
      </div>

      {/* Categories Section */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Categories</h3>
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {/* Add Category Form */}
        {isAddingCategory && (
          <form onSubmit={handleSubmitCategory} className="mb-4">
            <div className="flex flex-col space-y-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              {categoryError && (
                <p className="text-red-500 text-xs">{categoryError}</p>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategory('');
                    setCategoryError('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Rename Category Form */}
        {categoryToRename && (
          <form onSubmit={handleRenameCategory} className="mb-4">
            <div className="flex flex-col space-y-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={`Rename "${categoryToRename}"`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              {categoryError && (
                <p className="text-red-500 text-xs">{categoryError}</p>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryToRename(null);
                    setNewCategoryName('');
                    setCategoryError('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Rename
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirmation && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 mb-2">
              <strong>Warning:</strong> The category "{categoryToDelete}" has {playlistCount} playlist(s). 
              Deleting it will also delete all associated playlists and videos.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setCategoryToDelete(null);
                  setPlaylistCount(0);
                }}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteWithPlaylists}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Delete Category & Playlists
              </button>
            </div>
          </div>
        )}

        {/* Category List */}
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => setActiveCategory('all')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center ${
                activeCategory === 'all'
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              All Playlists
            </button>
          </li>
          {categories.map((category) => (
            <li key={category} className="relative">
              <div className="flex items-center">
              <button
                onClick={() => setActiveCategory(category)}
                  className={`flex-grow text-left px-3 py-2 rounded-md transition-colors flex items-center ${
                  activeCategory === category
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                </svg>
                {category}
              </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoryMenu(category);
                  }}
                  className="p-1 ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                  </svg>
                </button>
              </div>
              
              {/* Category Action Menu */}
              {categoryMenuOpen === category && (
                <div className="absolute right-1 mt-1 w-36 bg-white dark:bg-gray-800 shadow-lg rounded-md z-10 border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setCategoryToRename(category);
                      setNewCategoryName(category);
                      setCategoryMenuOpen(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-md"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Badges Section */}
      <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => router.push('/badges')}
          className="w-full flex items-center justify-between p-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-yellow-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872M7.5 18.75h9M3 3h18M9.75 9.75v4.5M11.251 9.75h1.5v4.5h-1.5v-4.5z" />
            </svg>
            <span>My Badges</span>
          </div>
          {badgeCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {badgeCount}
            </span>
          )}
          </button>
        </div>
      </div>
  );
} 