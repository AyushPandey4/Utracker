const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const Video = require('../models/Video');
const { setCache, getCache, deleteCache } = require('../config/redisUtils');
const Badge = require('../models/Badge');

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
    
    // First, get playlist details
    const playlistResponse = await youtube.playlists.list({
      part: 'snippet,contentDetails',
      id: playlistId
    });
    
    const playlistDetails = playlistResponse.data.items[0] || {};
    const playlistInfo = {
      title: playlistDetails.snippet?.title || '',
      description: playlistDetails.snippet?.description || '',
      thumbnail: playlistDetails.snippet?.thumbnails?.high?.url || '',
      channelTitle: playlistDetails.snippet?.channelTitle || '',
      itemCount: playlistDetails.contentDetails?.itemCount || 0,
      publishedAt: playlistDetails.snippet?.publishedAt || ''
    };
    
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
      
      // Fetch video details (for duration and view count)
      if (videoIds.length > 0) {
        const videoDetails = await youtube.videos.list({
          part: 'contentDetails,snippet,statistics',
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
            description: videoDetail.snippet.description || '',
            thumbnail: videoDetail.snippet.thumbnails.high?.url || videoDetail.snippet.thumbnails.medium?.url || '',
            duration: videoDetail.contentDetails.duration,
            viewCount: videoDetail.statistics?.viewCount || 0,
            likeCount: videoDetail.statistics?.likeCount || 0,
            publishedAt: videoDetail.snippet.publishedAt,
            channelTitle: videoDetail.snippet.channelTitle,
            position: playlistItem ? playlistItem.snippet.position : 0
          });
        });
      }
      
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);
    
    // Sort videos by position
    videos.sort((a, b) => a.position - b.position);
    
    const result = {
      playlistInfo,
      videos
    };
    
    // Cache the result for 24 hours
    await setCache(cacheKey, result, 86400);
    
    return result;
  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    throw error;
  }
};

// Fetch a single YouTube video details
const fetchYouTubeVideo = async (videoId) => {
  try {
    const videoDetails = await youtube.videos.list({
      part: 'snippet,contentDetails,statistics',
      id: videoId
    });
    
    if (!videoDetails.data.items || videoDetails.data.items.length === 0) {
      return null;
    }
    
    const videoData = videoDetails.data.items[0];
    
    return {
      ytId: videoData.id,
      title: videoData.snippet.title,
      description: videoData.snippet.description || '',
      thumbnail: videoData.snippet.thumbnails.high?.url || videoData.snippet.thumbnails.medium?.url || '',
      duration: videoData.contentDetails.duration,
      viewCount: videoData.statistics?.viewCount || 0,
      likeCount: videoData.statistics?.likeCount || 0,
      publishedAt: videoData.snippet.publishedAt,
      channelTitle: videoData.snippet.channelTitle,
      position: 0
    };
  } catch (error) {
    console.error('Error fetching YouTube video:', error);
    return null;
  }
};

// Extract YouTube video ID from URL
const extractVideoId = (url) => {
  try {
    const urlObj = new URL(url);
    
    // For URLs like https://www.youtube.com/watch?v=VIDEO_ID
    if (urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }
    
    // For URLs like https://youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.substring(1);
    }
    
    return null;
  } catch (err) {
    return null;
  }
};

// Helper function to parse ISO 8601 duration to minutes
const parseIsoDuration = (isoDuration) => {
  if (!isoDuration) return 0;
  
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return 0;
  
  const hours = parseInt(matches[1] || 0);
  const minutes = parseInt(matches[2] || 0);
  const seconds = parseInt(matches[3] || 0);
  
  return hours * 60 + minutes + seconds / 60;
};

// @route   POST /api/playlist/add
// @desc    Add a new playlist
// @access  Private
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { ytPlaylistUrl, name, category } = req.body;
    
    // Validate request
    if (!name) {
      return res.status(400).json({ msg: 'Playlist name is required' });
    }
    
    let finalCategory = category || 'Uncategorized';
    
    // Check if user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if category exists (or it's Uncategorized)
    if (finalCategory !== 'Uncategorized' && !user.categories.includes(finalCategory)) {
      // If Uncategorized is not in the user's categories, add it
      if (!user.categories.includes('Uncategorized')) {
        user.categories.push('Uncategorized');
        await user.save();
      }
      
      // Use Uncategorized instead of the provided category
      finalCategory = 'Uncategorized';
    }
    
    // If this is a YouTube playlist (has a URL)
    if (ytPlaylistUrl) {
      // Extract playlist ID
      const playlistId = extractPlaylistId(ytPlaylistUrl);
      if (!playlistId) {
        return res.status(400).json({ msg: 'Invalid YouTube playlist URL' });
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
      const ytData = await fetchPlaylistVideos(playlistId);
      
      // Create a new playlist
      const newPlaylist = new Playlist({
        userId: req.user.id,
        name,
        category: finalCategory,
        ytPlaylistUrl,
        ytPlaylistId: playlistId,
        ytInfo: ytData.playlistInfo,
        videos: [],
        isCustomPlaylist: false,
        completed: false
      });
      
      await newPlaylist.save();
      
      // Create video documents for each video
      const videoPromises = ytData.videos.map(async (ytVideo) => {
        const video = new Video({
          playlistId: newPlaylist._id,
          title: ytVideo.title,
          ytId: ytVideo.ytId,
          description: ytVideo.description,
          thumbnail: ytVideo.thumbnail,
          duration: ytVideo.duration,
          viewCount: ytVideo.viewCount,
          likeCount: ytVideo.likeCount,
          publishedAt: ytVideo.publishedAt,
          channelTitle: ytVideo.channelTitle,
          position: ytVideo.position || 0,
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
    } else {
      // This is a custom playlist (no YouTube URL)
      const newPlaylist = new Playlist({
        userId: req.user.id,
        name,
        category: finalCategory,
        ytPlaylistUrl: '',
        ytPlaylistId: '',
        isCustomPlaylist: true,
        ytInfo: {
          title: name,
          description: '',
          thumbnail: '',
          channelTitle: '',
          itemCount: 0,
          publishedAt: new Date().toISOString()
        },
        videos: [],
        completed: false
      });
      
      await newPlaylist.save();
      
      // Add playlist to user's playlists
      user.playlists.push(newPlaylist._id);
      await user.save();
      
      // Clear related cache
      await deleteCache(`playlists:${req.user.id}`);
      
      res.status(201).json(newPlaylist);
    }
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
      .select('name category videos completed createdAt ytInfo ytPlaylistUrl ytPlaylistId isCustomPlaylist');
    
    // Fetch all videos for these playlists in a single query
    const playlistIds = playlists.map(playlist => playlist._id);
    const allVideos = await Video.find({ playlistId: { $in: playlistIds } })
                               .select('playlistId status timeSpent notes thumbnail viewCount duration title ytId position'); 
    
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
      const rewatchCount = playlistVideos.filter(video => video.status === 'rewatch').length;
      const totalTimeSpent = playlistVideos.reduce((sum, video) => sum + (video.timeSpent || 0), 0);
      const notesCount = playlistVideos.filter(video => video.notes && video.notes.trim()).length;
      
      const progress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
      
      // Format response object
      return {
        id: playlist._id,
        name: playlist.name,
        category: playlist.category,
        ytInfo: playlist.ytInfo || {},
        ytPlaylistUrl: playlist.ytPlaylistUrl,
        ytPlaylistId: playlist.ytPlaylistId,
        isCustomPlaylist: playlist.isCustomPlaylist,
        totalVideos,
        completedVideos,
        inProgressVideos,
        rewatchCount,
        progress: Math.round(progress),
        completed: playlist.completed,
        totalTimeSpent,
        notesCount,
        createdAt: playlist.createdAt,
        thumbnails: playlistVideos.slice(0, 3).map(video => ({
          id: video._id,
          ytId: video.ytId,
          thumbnail: video.thumbnail,
          title: video.title,
          viewCount: video.viewCount,
          duration: video.duration
        }))
      };
    });
    
    // Sort playlists by creation date (newest first)
    playlistsWithProgress.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Cache the result
    await setCache(cacheKey, playlistsWithProgress, 3600); // Cache for 1 hour
    
    res.json(playlistsWithProgress);
  } catch (err) {
    console.error('Error fetching playlists:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/playlist/:id
// @desc    Get playlist by ID with videos
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
    
    // Fetch the playlist
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      return res.status(404).json({ msg: 'Playlist not found' });
    }
    
    // Verify that this playlist belongs to the user
    if (playlist.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to access this playlist' });
    }
    
    // Fetch all videos for this playlist
    const videos = await Video.find({ playlistId })
      .select('title ytId status timeSpent notes aiSummary aiSummaryGenerated thumbnail duration viewCount likeCount publishedAt channelTitle description tags position resources')
      .sort({ 'position': 1, 'createdAt': 1 });
    
    // Calculate progress
    const totalVideos = videos.length;
    const completedVideos = videos.filter(video => video.status === 'completed').length;
    const inProgressVideos = videos.filter(video => video.status === 'in-progress').length;
    const rewatchCount = videos.filter(video => video.status === 'rewatch').length;
    const progress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

    // Calculate total duration in minutes
    const totalDurationMinutes = videos.reduce((total, video) => {
      return total + parseIsoDuration(video.duration);
    }, 0);

    // Calculate estimated time left based on uncompleted videos
    const uncompletedVideos = videos.filter(video => video.status !== 'completed');
    const averageVideoDuration = totalVideos > 0 ? totalDurationMinutes / totalVideos : 0;
    const estimatedTimeLeft = Math.round(averageVideoDuration * uncompletedVideos.length);

    // Format response
    const formattedResponse = {
      id: playlist._id,
      _id: playlist._id,
      name: playlist.name,
      category: playlist.category,
      ytInfo: playlist.ytInfo || {},
      ytPlaylistUrl: playlist.ytPlaylistUrl,
      ytPlaylistId: playlist.ytPlaylistId,
      isCustomPlaylist: playlist.isCustomPlaylist,
      totalVideos,
      completedVideos,
      inProgressVideos,
      rewatchCount,
      progress: Math.round(progress),
      completed: playlist.completed,
      totalTimeSpent: videos.reduce((sum, video) => sum + (video.timeSpent || 0), 0),
      notesCount: videos.filter(video => video.notes && video.notes.trim()).length,
      createdAt: playlist.createdAt,
      videos: videos.map(video => ({
        id: video._id,
        title: video.title,
        ytId: video.ytId,
        status: video.status,
        timeSpent: video.timeSpent || 0,
        notes: video.notes || '',
        aiSummary: video.aiSummary || '',
        aiSummaryGenerated: video.aiSummaryGenerated || false,
        thumbnail: video.thumbnail,
        duration: video.duration,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        publishedAt: video.publishedAt,
        channelTitle: video.channelTitle,
        description: video.description,
        tags: video.tags || [],
        position: video.position || 0,
        resources: video.resources || []
      })),
      totalDuration: totalDurationMinutes,
      estimatedTimeLeft
    };

    // Cache the result
    await setCache(cacheKey, formattedResponse, 3600); // Cache for 1 hour
    
    res.json(formattedResponse);
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
    
    // Delete any badges associated with this playlist
    await Badge.deleteMany({
      userId: req.user.id,
      title: `Completed: ${playlist.name}`
    });
    
    // Remove playlist reference from user
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { playlists: playlistId }
    });
    
    // Delete playlist
    await Playlist.findByIdAndDelete(playlistId);
    
    // Clear related cache
    await deleteCache(`playlists:${req.user.id}`);
    await deleteCache(`playlist:${playlistId}`);
    await deleteCache(`badges:${req.user.id}`);
    
    res.json({ msg: 'Playlist deleted successfully' });
  } catch (err) {
    console.error('Error deleting playlist:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/playlist/:id/add-video
// @desc    Add a video to a playlist
// @access  Private
router.post('/:id/add-video', authenticateToken, async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const playlistId = req.params.id;
    
    if (!videoUrl) {
      return res.status(400).json({ msg: 'Video URL is required' });
    }
    
    // Find playlist
    const playlist = await Playlist.findOne({ 
      _id: playlistId, 
      userId: req.user.id 
    });
    
    if (!playlist) {
      return res.status(404).json({ msg: 'Playlist not found' });
    }

    // Check if it's a custom playlist
    if (!playlist.isCustomPlaylist) {
      return res.status(403).json({ msg: 'Videos can only be added to custom playlists' });
    }
    
    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return res.status(400).json({ msg: 'Invalid YouTube video URL' });
    }
    
    // Check if video already exists in playlist
    const existingVideo = await Video.findOne({
      playlistId,
      ytId: videoId
    });
    
    if (existingVideo) {
      return res.status(400).json({ msg: 'Video already exists in this playlist' });
    }
    
    // Fetch video details from YouTube API
    const videoData = await fetchYouTubeVideo(videoId);
    if (!videoData) {
      return res.status(404).json({ msg: 'Video not found on YouTube' });
    }
    
    // Create new video
    const video = new Video({
      playlistId,
      title: videoData.title,
      ytId: videoData.ytId,
      description: videoData.description,
      thumbnail: videoData.thumbnail,
      duration: videoData.duration,
      viewCount: videoData.viewCount,
      likeCount: videoData.likeCount,
      publishedAt: videoData.publishedAt,
      channelTitle: videoData.channelTitle,
      position: videoData.position || 0,
      status: 'to-watch',
      timeSpent: 0,
      notes: '',
      aiSummary: '',
      aiSummaryGenerated: false
    });
    
    await video.save();
    
    // Add video to playlist
    playlist.videos.push(video._id);
    await playlist.save();
    
    // Clear cache
    await deleteCache(`playlist:${playlistId}`);
    
    res.json({
      success: true,
      video: {
        id: video._id,
        title: video.title,
        ytId: video.ytId,
        thumbnail: video.thumbnail
      }
    });
  } catch (err) {
    console.error('Error adding video to playlist:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/playlist/:id/sync
// @desc    Sync playlist with YouTube
// @access  Private
router.post('/:id/sync', authenticateToken, async (req, res) => {
  try {
    const playlistId = req.params.id;
    
    // Find the playlist
    const playlist = await Playlist.findOne({ 
      _id: playlistId, 
      userId: req.user.id 
    });
    
    if (!playlist) {
      return res.status(404).json({ msg: 'Playlist not found' });
    }
    
    // Check if this is a YouTube playlist
    if (!playlist.ytPlaylistId) {
      return res.status(400).json({ msg: 'This is not a YouTube playlist' });
    }
    
    // Fetch existing videos for this playlist (to check for new ones)
    const existingVideos = await Video.find({ playlistId });
    const existingYtIds = existingVideos.map(video => video.ytId);
    
    // Invalidate YouTube playlist cache to get fresh data
    const cacheKey = `yt:playlist:${playlist.ytPlaylistId}`;
    await deleteCache(cacheKey);
    
    // Fetch latest videos from YouTube
    const ytData = await fetchPlaylistVideos(playlist.ytPlaylistId);
    
    // Find videos that are not already in our database
    const newVideos = ytData.videos.filter(ytVideo => 
      !existingYtIds.includes(ytVideo.ytId)
    );
    
    if (newVideos.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Playlist is already up to date',
        newVideosCount: 0
      });
    }
    
    // Create video documents for each new video
    const videoPromises = newVideos.map(async (ytVideo) => {
      const video = new Video({
        playlistId,
        title: ytVideo.title,
        ytId: ytVideo.ytId,
        description: ytVideo.description,
        thumbnail: ytVideo.thumbnail,
        duration: ytVideo.duration,
        viewCount: ytVideo.viewCount,
        likeCount: ytVideo.likeCount,
        publishedAt: ytVideo.publishedAt,
        channelTitle: ytVideo.channelTitle,
        position: ytVideo.position || 0,
        status: 'to-watch',
        timeSpent: 0,
        notes: '',
        aiSummary: '',
        aiSummaryGenerated: false
      });
      
      await video.save();
      
      // Add video reference to playlist
      playlist.videos.push(video._id);
      
      return video;
    });
    
    const addedVideos = await Promise.all(videoPromises);
    
    // Update playlist with video references and new YouTube info
    playlist.ytInfo = ytData.playlistInfo;
    await playlist.save();
    
    // Clear related cache
    await deleteCache(`playlist:${playlistId}`);
    await deleteCache(`playlists:${req.user.id}`);
    
    res.json({
      success: true, 
      message: `Added ${newVideos.length} new videos to the playlist`,
      newVideosCount: newVideos.length,
      videos: addedVideos.map(v => ({
        id: v._id,
        title: v.title,
        ytId: v.ytId,
        thumbnail: v.thumbnail
      }))
    });
  } catch (err) {
    console.error('Error syncing playlist with YouTube:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// @route   POST /api/playlist/:id/reset
// @desc    Reset playlist progress (set all videos to to-watch)
// @access  Private
router.post('/:id/reset', authenticateToken, async (req, res) => {
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
    
    // Reset all videos to 'to-watch' status
    // But keep notes, resources, and other user data
    await Video.updateMany(
      { playlistId }, 
      { $set: { status: 'to-watch' } }
    );
    
    // Get updated videos
    const updatedVideos = await Video.find({ playlistId })
      .select('title status');
    
    // Clear related cache
    await deleteCache(`playlist:${playlistId}`);
    await deleteCache(`playlists:${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Playlist progress has been reset',
      videosCount: updatedVideos.length
    });
  } catch (err) {
    console.error('Error resetting playlist progress:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PATCH /api/playlist/:playlistId/toggle-pin-video/:videoId
// @desc    Toggle pin status for a video
// @access  Private
router.patch('/:playlistId/toggle-pin-video/:videoId', authenticateToken, async (req, res) => {
  try {
    const { playlistId, videoId } = req.params;
    
    // Find playlist and verify ownership
    const playlist = await Playlist.findOne({ 
      _id: playlistId, 
      userId: req.user.id 
    });
    
    if (!playlist) {
      return res.status(404).json({ msg: 'Playlist not found' });
    }
    
    // Find video
    const video = await Video.findOne({
      _id: videoId,
      playlistId
    });
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Toggle pinned status
    video.pinned = !video.pinned;
    await video.save();
    
    // Clear related cache
    await deleteCache(`playlist:${playlistId}`);
    await deleteCache(`playlists:${req.user.id}`);
    
    res.json({
      success: true,
      pinned: video.pinned,
      message: video.pinned ? 'Video pinned successfully' : 'Video unpinned successfully'
    });
  } catch (err) {
    console.error('Error toggling video pin status:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PATCH /api/playlist/:id/reorder
// @desc    Reorder videos within a playlist
// @access  Private
router.patch('/:id/reorder', authenticateToken, async (req, res) => {
  try {
    const { videoPositions } = req.body;
    const playlistId = req.params.id;
    
    if (!videoPositions || !Array.isArray(videoPositions) || videoPositions.length === 0) {
      return res.status(400).json({ msg: 'Video positions array is required' });
    }
    
    // Verify playlist ownership
    const playlist = await Playlist.findOne({
      _id: playlistId,
      userId: req.user.id
    });
    
    if (!playlist) {
      return res.status(404).json({ msg: 'Playlist not found' });
    }
    
    // Update position for each video
    const updatePromises = videoPositions.map(item => {
      return Video.findOneAndUpdate(
        { _id: item.id, playlistId },
        { position: item.position },
        { new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    // Clear related cache
    await deleteCache(`playlist:${playlistId}`);
    
    res.json({
      success: true,
      message: 'Videos reordered successfully'
    });
  } catch (err) {
    console.error('Error reordering videos:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PATCH /api/playlist/:id/category
// @desc    Update playlist category
// @access  Private
router.patch('/:id/category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({ msg: 'Category is required' });
    }
    
    // Find and update playlist
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { category },
      { new: true }
    );
    
    if (!playlist) {
      return res.status(404).json({ msg: 'Playlist not found' });
    }
    
    // Clear cache
    await deleteCache(`playlist:${playlist._id}`);
    await deleteCache(`playlists:${req.user.id}`);
    
    res.json({
      id: playlist._id,
      category: playlist.category
    });
  } catch (err) {
    console.error('Error updating playlist category:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Helper function to format duration in hours and minutes
function formatDuration(minutes) {
  if (isNaN(minutes) || minutes <= 0) return '0 min';
  
  minutes = Math.round(minutes);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  
  return `${hours} hr ${mins} min`;
}

module.exports = router; 