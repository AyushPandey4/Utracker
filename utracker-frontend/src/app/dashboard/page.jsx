'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { usePlaylist } from '../../context/PlaylistContext';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from '../../components/dashboard/Sidebar';
import DailyGoal from '../../components/dashboard/DailyGoal';
import PlaylistGrid from '../../components/dashboard/PlaylistGrid';
import AddPlaylistModal from '../../components/dashboard/AddPlaylistModal';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { 
    playlists, 
    categories, 
    loading: playlistLoading, 
    activeCategory, 
    setActiveCategory,
    getFilteredPlaylists,
    addPlaylist,
    deletePlaylist,
    addCategory
  } = usePlaylist();
  
  const [dailyGoal, setDailyGoal] = useState('');
  const [badges, setBadges] = useState([]);
  const [isAddPlaylistModalOpen, setIsAddPlaylistModalOpen] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Load dashboard data
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);
      
      // Fetch daily goal
      const dailyGoalResponse = await axios.get(`${API_URL}/api/user/daily-goal`);
      setDailyGoal(dailyGoalResponse.data.dailyGoal || '');
      
      // Fetch badges summary
      const badgesResponse = await axios.get(`${API_URL}/api/badge/my-badges`);
      setBadges(badgesResponse.data || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error.message);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleDailyGoalUpdate = async (newGoal) => {
    try {
      await axios.post(`${API_URL}/api/user/daily-goal`, { dailyGoal: newGoal });
      setDailyGoal(newGoal);
    } catch (error) {
      console.error('Error updating daily goal:', error.message);
    }
  };

  const handleAddPlaylist = async (playlistData) => {
    const result = await addPlaylist(playlistData);
    if (result.success) {
      setIsAddPlaylistModalOpen(false);
    }
    return result;
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  // If not authenticated and not loading, redirect to home page
  if (!user) {
    return null; // Return null while redirect happens
  }

  const filteredPlaylists = getFilteredPlaylists();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pt-6">
      <div className="container mx-auto px-4 flex flex-col gap-6">
        {/* Top Navigation Bar */}
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Utracker</h1>
          
          <div className="flex items-center gap-4">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-700 dark:text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
            
            {/* User profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border-2 border-transparent hover:border-blue-500"
                />
                <span className="hidden sm:inline text-gray-800 dark:text-white font-medium">
                  {user.name}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-600 dark:text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-10 border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 p-4 rounded-lg">
          <h2 className="text-xl md:text-2xl font-semibold">
            Hello, <span className="text-blue-600 dark:text-blue-400">{user.name}</span> 👋
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Welcome to your playlist dashboard</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <Sidebar 
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onAddPlaylistClick={() => setIsAddPlaylistModalOpen(true)}
          onAddCategory={addCategory}
          badgeCount={badges.length}
        />
        
        {/* Main Content */}
        <div className="flex-1">
          {/* Daily Goal Section */}
          <DailyGoal 
            dailyGoal={dailyGoal} 
            onUpdate={handleDailyGoalUpdate} 
          />
          
          {/* Playlists Grid */}
          <div className="mt-8">
            {dashboardLoading || playlistLoading ? (
              <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
              </div>
            ) : (
              <PlaylistGrid 
                playlists={filteredPlaylists} 
                onDelete={deletePlaylist}
              />
            )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Playlist Modal */}
      {isAddPlaylistModalOpen && (
        <AddPlaylistModal 
          onClose={() => setIsAddPlaylistModalOpen(false)}
          onAdd={handleAddPlaylist}
          categories={categories}
          onAddCategory={addCategory}
        />
      )}
    </div>
  );
} 