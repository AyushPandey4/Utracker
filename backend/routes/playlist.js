const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const Video = require('../models/Video');
const { setCache, getCache, deleteCache } = require('../config/redisUtils');

// Initialize YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

/**
 * Extract YouTube playlist ID from URL
 * @param {string} url - YouTube playlist URL
 * @returns {string|null} - Playlist ID or null if not found
 */
const extractPlaylistId = (url) => {
  try {
    const urlObj = new URL(url);
    
    // For URLs like https://www.youtube.com/playlist?list=PLAYLIST_ID
    if (urlObj.searchParams.has('list')) {
      return urlObj.searchParams.get('list');
    }
    
    return null;
  } catch (err) {
    return null;
  }
};

/**
 * Fetch all videos from a YouTube playlist
 * @param {string} playlistId - YouTube playlist ID
 * @returns {Promise<Array>} - Array of video details
 */
const fetchPlaylistVideos = async (playlistId) => {
  try {
    // Check cache first
    const cacheKey = `yt:playlist:${playlistId}`;
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const videos = [];
    let nextPageToken = null;
    
    do {
      // Fetch playlist items
      const response = await youtube.playlistItems.list({
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: 50,
        pageToken: nextPageToken || ''
      });
      
      const videoIds = response.data.items.map(item => item.contentDetails.videoId);
      
      // Fetch video details (for duration)
      if (videoIds.length > 0) {
        const videoDetails = await youtube.videos.list({
          part: 'contentDetails,snippet',
          id: videoIds.join(',')
        });
        
        // Combine data from both API calls
        videoDetails.data.items.forEach(videoDetail => {
          const playlistItem = response.data.items.find(
            item => item.contentDetails.videoId === videoDetail.id
          );
          
          videos.push({
            ytId: videoDetail.id,
            title: videoDetail.snippet.title,
            thumbnail: videoDetail.snippet.thumbnails.medium.url,
            duration: videoDetail.contentDetails.duration,
            position: playlistItem ? playlistItem.snippet.position : 0
          });
        });
      }
      
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);
    
    // Sort videos by position
    videos.sort((a, b) => a.position - b.position);
    
    // Cache the result for 24 hours
    await setCache(cacheKey, videos, 86400);
    
    return videos;
  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    throw error;
  }
};

// @route   POST /api/playlist/add
// @desc    Add a new playlist
// @access  Private
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { ytPlaylistUrl, name, category } = req.body;
    
    // Validate request
    if (!ytPlaylistUrl || !name || !category) {
      return res.status(400).json({ msg: 'All fields are required' });
    }
    
    // Extract playlist ID
    const playlistId = extractPlaylistId(ytPlaylistUrl);
    if (!playlistId) {
      return res.status(400).json({ msg: 'Invalid YouTube playlist URL' });
    }
    
    // Check if user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if category exists
    if (!user.categories.includes(category)) {
      return res.status(400).json({ msg: 'Category does not exist' });
    }
    
    // Check if playlist already exists for this user
    const existingPlaylist = await Playlist.findOne({ 
      userId: req.user.id, 
      ytPlaylistUrl: ytPlaylistUrl 
    });
    
    if (existingPlaylist) {
      return res.status(400).json({ msg: 'Playlist already exists' });
    }
    
    // Fetch videos from YouTube API
    const ytVideos = await fetchPlaylistVideos(playlistId);
    
    // Create a new playlist
    const newPlaylist = new Playlist({
      userId: req.user.id,
      name,
      category,
      ytPlaylistUrl,
      videos: [],
      completed: false
    });
    
    await newPlaylist.save();
    
    // Create video documents for each video
    const videoPromises = ytVideos.map(async (ytVideo) => {
      const video = new Video({
        playlistId: newPlaylist._id,
        title: ytVideo.title,
        ytId: ytVideo.ytId,
        status: 'to-watch',
        timeSpent: 0,
        notes: '',
        aiSummary: '',
        aiSummaryGenerated: false
      });
      
      await video.save();
      
      // Add video reference to playlist
      newPlaylist.videos.push(video._id);
    });
    
    await Promise.all(videoPromises);
    
    // Update playlist with video references
    await newPlaylist.save();
    
    // Add playlist to user's playlists
    user.playlists.push(newPlaylist._id);
    await user.save();
    
    // Clear related cache
    await deleteCache(`playlists:${req.user.id}`);
    
    res.status(201).json(newPlaylist);
  } catch (err) {
    console.error('Error adding playlist:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/playlist
// @desc    Get all playlists for user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check cache first
    const cacheKey = `playlists:${req.user.id}`;
    const cachedPlaylists = await getCache(cacheKey);
    
    if (cachedPlaylists) {
      return res.json(cachedPlaylists);
    }
    
    // Fetch playlists from database
    const playlists = await Playlist.find({ userId: req.user.id })
      .select('name category videos completed createdAt');
    
    // Fetch all videos for these playlists in a single query
    const playlistIds = playlists.map(playlist => playlist._id);
    const allVideos = await Video.find({ playlistId: { $in: playlistIds } })
                               .select('playlistId status timeSpent notes'); 
    
    // Group videos by playlist ID for easier access
    const videosByPlaylist = {};
    allVideos.forEach(video => {
      const playlistIdString = video.playlistId.toString();
      if (!videosByPlaylist[playlistIdString]) {
        videosByPlaylist[playlistIdString] = [];
      }
      videosByPlaylist[playlistIdString].push(video);
    });
    
    // Calculate progress for each playlist
    const playlistsWithProgress = playlists.map(playlist => {
      const playlistIdString = playlist._id.toString();
      const playlistVideos = videosByPlaylist[playlistIdString] || [];
      
      const totalVideos = playlistVideos.length;
      const completedVideos = playlistVideos.filter(video => video.status === 'completed').length;
      const inProgressVideos = playlistVideos.filter(video => video.status === 'in-progress').length;
      const totalTimeSpent = playlistVideos.reduce((sum, video) => sum + (video.timeSpent || 0), 0);
      const notesCount = playlistVideos.filter(video => video.notes && video.notes.trim()).length;
      
      const progress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
      
      // Format response object
      return {
        id: playlist._id,
        name: playlist.name,
        category: playlist.category,
        totalVideos,
        completedVideos,
        inProgressVideos,
        progress: Math.round(progress),
        completed: playlist.completed,
        createdAt: playlist.createdAt,
        totalTimeSpent,
        notesCount,
        videos: playlistVideos.map(v => ({
          id: v._id,
          status: v.status,
          timeSpent: v.timeSpent,
          hasNotes: v.notes && v.notes.trim().length > 0
        }))
      };
    });
    
    // Cache the result for 1 hour (shorter time as this data changes frequently)
    await setCache(cacheKey, playlistsWithProgress, 3600);
    
    res.json(playlistsWithProgress);
  } catch (err) {
    console.error('Error fetching playlists:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/playlist/:id
// @desc    Get single playlist with videos
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const playlistId = req.params.id;
    
    // Check cache first
    const cacheKey = `playlist:${playlistId}`;
    const cachedPlaylist = await getCache(cacheKey);
    
    if (cachedPlaylist) {
      return res.json(cachedPlaylist);
    }
    
    // Fetch playlist with populated videos
    const playlist = await Playlist.findOne({ 
      _id: playlistId, 
      userId: req.user.id 
    });
    
    if (!playlist) {
      return res.status(404).json({ msg: 'Playlist not found' });
    }
    
    // Fetch videos
    const videos = await Video.find({ playlistId });
    
    // Calculate progress statistics
    const totalVideos = videos.length;
    const completedVideos = videos.filter(video => video.status === 'completed').length;
    const inProgressVideos = videos.filter(video => video.status === 'in-progress').length;
    const progress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
    
    // Format response
    const result = {
      id: playlist._id,
      name: playlist.name,
      category: playlist.category,
      ytPlaylistUrl: playlist.ytPlaylistUrl,
      totalVideos,
      completedVideos,
      inProgressVideos,
      progress: Math.round(progress),
      completed: playlist.completed,
      createdAt: playlist.createdAt,
      videos: videos.map(video => ({
        id: video._id,
        title: video.title,
        ytId: video.ytId,
        status: video.status,
        timeSpent: video.timeSpent,
        notes: video.notes,
        aiSummary: video.aiSummary,
        aiSummaryGenerated: video.aiSummaryGenerated
      }))
    };
    
    // Cache the result for 30 minutes
    await setCache(cacheKey, result, 1800);
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching playlist:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   DELETE /api/playlist/:id
// @desc    Delete playlist and its videos
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const playlistId = req.params.id;
    
    // Find playlist
    const playlist = await Playlist.findOne({ 
      _id: playlistId, 
      userId: req.user.id 
    });
    
    if (!playlist) {
      return res.status(404).json({ msg: 'Playlist not found' });
    }
    
    // Delete all videos associated with this playlist
    await Video.deleteMany({ playlistId });
    
    // Remove playlist reference from user
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { playlists: playlistId }
    });
    
    // Delete playlist
    await Playlist.findByIdAndDelete(playlistId);
    
    // Clear related cache
    await deleteCache(`playlists:${req.user.id}`);
    await deleteCache(`playlist:${playlistId}`);
    
    res.json({ msg: 'Playlist deleted successfully' });
  } catch (err) {
    console.error('Error deleting playlist:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router; 