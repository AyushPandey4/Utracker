'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const PlaylistContext = createContext();
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export function PlaylistProvider({ children }) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Load playlists when user is authenticated
  useEffect(() => {
    if (user) {
      fetchPlaylists();
      fetchCategories();
    }
  }, [user]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/playlist`);
      setPlaylists(response.data || []);
    } catch (error) {
      console.error('Error fetching playlists:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user/categories`);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error.message);
    }
  };

  const addPlaylist = async (playlistData) => {
    try {
      // Make sure backend required fields are set
      if (!playlistData.name || !playlistData.ytPlaylistUrl || !playlistData.category) {
        return { 
          success: false, 
          message: 'Name, YouTube playlist URL, and category are required' 
        };
      }
      
      // Use the correct API endpoint - /api/playlist/add
      const response = await axios.post(`${API_URL}/api/playlist/add`, playlistData);
      
      // After successfully adding, refresh the playlists list
      await fetchPlaylists();
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error adding playlist:', error);
      
      // Handle specific error messages from the backend
      if (error.response && error.response.data && error.response.data.msg) {
        return { 
          success: false, 
          message: error.response.data.msg 
        };
      }
      
      // Generic error handling
      return { 
        success: false, 
        message: 'Failed to add playlist. Please check your playlist URL and try again.' 
      };
    }
  };

  const deletePlaylist = async (playlistId) => {
    try {
      await axios.delete(`${API_URL}/api/playlist/${playlistId}`);
      setPlaylists(playlists.filter(playlist => playlist._id !== playlistId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting playlist:', error.message);
      return { success: false, message: 'Failed to delete playlist' };
    }
  };

  const addCategory = async (categoryName) => {
    try {
      const response = await axios.post(`${API_URL}/api/user/category`, { category: categoryName });
      setCategories(response.data);
      return { success: true };
    } catch (error) {
      console.error('Error adding category:', error.message);
      return { success: false, message: 'Failed to add category' };
    }
  };

  const getFilteredPlaylists = () => {
    if (activeCategory === 'all') return playlists;
    return playlists.filter(playlist => playlist.category === activeCategory);
  };

  return (
    <PlaylistContext.Provider value={{
      playlists,
      categories,
      loading,
      activeCategory,
      setActiveCategory,
      getFilteredPlaylists,
      addPlaylist,
      deletePlaylist,
      addCategory,
      refreshPlaylists: fetchPlaylists
    }}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
} 