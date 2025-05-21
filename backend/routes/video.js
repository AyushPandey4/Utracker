const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const Video = require('../models/Video');
const Playlist = require('../models/Playlist');
const User = require('../models/User');
const Badge = require('../models/Badge');
const { setCache, getCache, deleteCache } = require('../config/redisUtils');
const { generateVideoSummary } = require('../services/aiService');
const { parseTimestamps } = require('../utils/videoUtils');

/**
 * Check if user has access to video
 * @param {string} videoId - Video ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if user has access
 */
const hasAccessToVideo = async (videoId, userId) => {
  try {
    const video = await Video.findById(videoId);
    if (!video) return false;
    
    const playlist = await Playlist.findOne({
      _id: video.playlistId,
      userId: userId
    });
    
    return !!playlist;
  } catch (err) {
    return false;
  }
};

/**
 * Check if playlist is completed and issue badge if needed
 * @param {string} playlistId - Playlist ID
 * @param {string} userId - User ID
 */
const checkAndAwardCompletionBadge = async (playlistId, userId) => {
  try {
    // Get all videos in the playlist
    const videos = await Video.find({ playlistId });
    
    // Check if all videos are completed
    const allCompleted = videos.every(video => video.status === 'completed');
    
    if (allCompleted) {
      // Update playlist completion status
      await Playlist.findByIdAndUpdate(playlistId, { completed: true });
      
      // Get playlist name for badge
      const playlist = await Playlist.findById(playlistId);
      
      // Check if user already has this badge
      const existingBadge = await Badge.findOne({
        userId,
        title: `Completed: ${playlist.name}`
      });
      
      if (!existingBadge) {
        // Create a completion badge
        const badge = new Badge({
          userId,
          title: `Completed: ${playlist.name}`,
          description: `Completed all videos in the "${playlist.name}" playlist`,
          iconUrl: '🏆', // Simple emoji as placeholder
          dateEarned: new Date()
        });
        
        await badge.save();
        
        // Add badge to user
        await User.findByIdAndUpdate(userId, {
          $push: { badges: badge._id }
        });
        
        // Clear badge cache to ensure the new badge is visible
        await deleteCache(`badges:${userId}`);
      }
      
      // Clear related cache
      await deleteCache(`playlist:${playlistId}`);
      await deleteCache(`playlists:${userId}`);
    }
  } catch (error) {
    console.error('Error checking playlist completion:', error);
  }
};

// @route   GET /api/video/pinned
// @desc    Get all pinned videos
// @access  Private
router.get('/pinned', authenticateToken, async (req, res) => {
  try {
    // Get all playlists for this user
    const userPlaylists = await Playlist.find({ userId: req.user.id });
    const playlistIds = userPlaylists.map(playlist => playlist._id);
    
    // Find all pinned videos
    const pinnedVideos = await Video.find({
      playlistId: { $in: playlistIds },
      pinned: true
    }).select('title ytId status timeSpent notes thumbnail duration viewCount publishedAt channelTitle description playlistId position');
    
    // If no pinned videos found
    if (pinnedVideos.length === 0) {
      return res.json({ videos: [] });
    }
    
    // Create map of playlist details for each video
    const playlistMap = {};
    userPlaylists.forEach(p => {
      playlistMap[p._id.toString()] = {
        name: p.name,
        category: p.category
      };
    });
    
    // Add playlist information to each video
    const videosWithPlaylistInfo = pinnedVideos.map(video => {
      const playlistInfo = playlistMap[video.playlistId.toString()] || {};
      
      return {
        id: video._id,
        title: video.title,
        ytId: video.ytId,
        status: video.status,
        thumbnail: video.thumbnail,
        duration: video.duration,
        timeSpent: video.timeSpent,
        notes: video.notes,
        viewCount: video.viewCount,
        publishedAt: video.publishedAt,
        channelTitle: video.channelTitle,
        description: video.description,
        position: video.position,
        playlistId: video.playlistId,
        playlistName: playlistInfo.name || 'Unknown Playlist',
        playlistCategory: playlistInfo.category || 'Uncategorized'
      };
    });
    
    res.json({ videos: videosWithPlaylistInfo });
  } catch (err) {
    console.error('Error fetching pinned videos:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/video/:id
// @desc    Fetch one video by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Check cache first
    const cacheKey = `video:${videoId}`;
    const cachedVideo = await getCache(cacheKey);
    
    if (cachedVideo) {
      return res.json(cachedVideo);
    }
    
    // Verify user has access to this video
    const hasAccess = await hasAccessToVideo(videoId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    // Fetch video
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Get playlist info for context
    const playlist = await Playlist.findById(video.playlistId).select('name category isCustomPlaylist');
    
    // Format response
    const result = {
      id: video._id,
      title: video.title,
      ytId: video.ytId,
      status: video.status,
      timeSpent: video.timeSpent,
      notes: video.notes,
      aiSummary: video.aiSummary,
      aiSummaryGenerated: video.aiSummaryGenerated,
      playlistId: video.playlistId,
      playlistName: playlist ? playlist.name : 'Unknown',
      playlistCategory: playlist ? playlist.category : 'Unknown',
      isCustomPlaylist: playlist ? playlist.isCustomPlaylist : false,
      createdAt: video.createdAt,
      timestamps: video.timestamps || [],
      resources: video.resources || []
    };
    
    // Cache the result for 1 hour
    await setCache(cacheKey, result, 3600);
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching video:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PATCH /api/video/:id/status
// @desc    Update video status
// @access  Private
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    const { status } = req.body;
    
    // Validate status
    if (!status || !['to-watch', 'in-progress', 'completed', 'rewatch'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Verify user has access to this video
    const hasAccess = await hasAccessToVideo(videoId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    // Update video
    const video = await Video.findByIdAndUpdate(
      videoId,
      { status },
      { new: true }
    );
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // If status is completed, check for playlist completion badge
    if (status === 'completed') {
      await checkAndAwardCompletionBadge(video.playlistId, req.user.id);
    }
    
    // Clear cache
    await deleteCache(`video:${videoId}`);
    await deleteCache(`playlist:${video.playlistId}`);
    
    res.json({ id: video._id, status: video.status });
  } catch (err) {
    console.error('Error updating video status:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PATCH /api/video/:id/note
// @desc    Add/update video notes
// @access  Private
router.patch('/:id/note', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    const { note } = req.body;
    
    // Validate note
    if (note === undefined) {
      return res.status(400).json({ msg: 'Note field is required' });
    }
    
    // Verify user has access to this video
    const hasAccess = await hasAccessToVideo(videoId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    // Update video
    const video = await Video.findByIdAndUpdate(
      videoId,
      { notes: note },
      { new: true }
    );
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Clear cache
    await deleteCache(`video:${videoId}`);
    
    res.json({ id: video._id, notes: video.notes });
  } catch (err) {
    console.error('Error updating video notes:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PATCH /api/video/:id/time
// @desc    Store time spent on video
// @access  Private
router.patch('/:id/time', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    const { timeSpent } = req.body;
    
    // Validate time
    if (timeSpent === undefined || typeof timeSpent !== 'number' || timeSpent < 0) {
      return res.status(400).json({ msg: 'Valid timeSpent value is required' });
    }
    
    // Verify user has access to this video
    const hasAccess = await hasAccessToVideo(videoId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    // Update video
    const video = await Video.findByIdAndUpdate(
      videoId,
      { timeSpent },
      { new: true }
    );
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Clear cache
    await deleteCache(`video:${videoId}`);
    
    res.json({ id: video._id, timeSpent: video.timeSpent });
  } catch (err) {
    console.error('Error updating video time spent:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PATCH /api/video/:id/ai-summary
// @desc    Save AI summary
// @access  Private
router.patch('/:id/ai-summary', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    const { summary } = req.body;
    
    // Validate summary
    if (!summary) {
      return res.status(400).json({ msg: 'Summary is required' });
    }
    
    // Verify user has access to this video
    const hasAccess = await hasAccessToVideo(videoId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    // Update video
    const video = await Video.findByIdAndUpdate(
      videoId,
      { 
        aiSummary: summary,
        aiSummaryGenerated: true
      },
      { new: true }
    );
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Clear cache
    await deleteCache(`video:${videoId}`);
    
    res.json({ 
      id: video._id, 
      aiSummary: video.aiSummary,
      aiSummaryGenerated: video.aiSummaryGenerated
    });
  } catch (err) {
    console.error('Error updating AI summary:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/video/:id/summary-to-note
// @desc    Copy AI summary to note
// @access  Private
router.post('/:id/summary-to-note', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Verify user has access to this video
    const hasAccess = await hasAccessToVideo(videoId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    // Get video
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Check if AI summary exists
    if (!video.aiSummary) {
      return res.status(400).json({ msg: 'No AI summary available to copy' });
    }
    
    // Copy AI summary to notes
    video.notes = video.aiSummary;
    await video.save();
    
    // Clear cache
    await deleteCache(`video:${videoId}`);
    
    res.json({ 
      id: video._id, 
      notes: video.notes
    });
  } catch (err) {
    console.error('Error copying AI summary to notes:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/video/:id/generate-summary
// @desc    Generate AI summary from YouTube transcript
// @access  Private
router.post('/:id/generate-summary', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Verify user has access to this video
    const hasAccess = await hasAccessToVideo(videoId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    // Get video
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Check if a summary has already been generated
    if (video.aiSummaryGenerated) {
      return res.status(400).json({ 
        msg: 'Summary already exists for this video', 
        aiSummary: video.aiSummary 
      });
    }
    
    // Generate summary from transcript
    const summary = await generateVideoSummary(video.ytId, video.title);
    
    // Update video with summary
    video.aiSummary = summary;
    video.aiSummaryGenerated = true;
    await video.save();
    
    // Clear cache
    await deleteCache(`video:${videoId}`);
    
    res.json({ 
      id: video._id, 
      aiSummary: video.aiSummary,
      aiSummaryGenerated: true
    });
  } catch (err) {
    console.error('Error generating summary from transcript:', err);
    
    // More specific error handling
    if (err.message.includes('No transcript available')) {
      return res.status(404).json({ msg: 'No transcript available for this video' });
    }
    
    if (err.message.includes('Rate limit')) {
      return res.status(429).json({ msg: 'Rate limit exceeded. Please try again later.' });
    }
    
    res.status(500).json({ msg: 'Error generating summary' });
  }
});

// @route   POST /api/video/:id/tags
// @desc    Add tags to a video
// @access  Private
router.post('/:id/tags', authenticateToken, async (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ msg: 'Tags array is required' });
    }
    
    // Format tags (remove # if present, lowercase, trim)
    const formattedTags = tags.map(tag => 
      tag.startsWith('#') ? tag.substring(1).trim().toLowerCase() : tag.trim().toLowerCase()
    ).filter(tag => tag.length > 0);
    
    // Find the video
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Ensure the video belongs to a playlist owned by the user
    const playlist = await Playlist.findOne({
      _id: video.playlistId,
      userId: req.user.id
    });
    
    if (!playlist) {
      return res.status(403).json({ msg: 'Not authorized to update this video' });
    }
    
    // Add new tags (avoiding duplicates)
    const existingTags = new Set(video.tags || []);
    formattedTags.forEach(tag => existingTags.add(tag));
    
    // Update video with new tags
    video.tags = Array.from(existingTags);
    await video.save();
    
    // Clear cache for this video's playlist
    await deleteCache(`playlist:${video.playlistId}`);
    
    res.json({ 
      success: true, 
      tags: video.tags 
    });
  } catch (err) {
    console.error('Error adding tags to video:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   DELETE /api/video/:id/tags
// @desc    Remove tags from a video
// @access  Private
router.delete('/:id/tags', authenticateToken, async (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ msg: 'Tags array is required' });
    }
    
    // Format tags (remove # if present, lowercase, trim)
    const tagsToRemove = tags.map(tag => 
      tag.startsWith('#') ? tag.substring(1).trim().toLowerCase() : tag.trim().toLowerCase()
    );
    
    // Find the video
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Ensure the video belongs to a playlist owned by the user
    const playlist = await Playlist.findOne({
      _id: video.playlistId,
      userId: req.user.id
    });
    
    if (!playlist) {
      return res.status(403).json({ msg: 'Not authorized to update this video' });
    }
    
    // Remove specified tags
    video.tags = (video.tags || []).filter(tag => !tagsToRemove.includes(tag));
    await video.save();
    
    // Clear cache for this video's playlist
    await deleteCache(`playlist:${video.playlistId}`);
    
    res.json({ 
      success: true, 
      tags: video.tags 
    });
  } catch (err) {
    console.error('Error removing tags from video:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/video/search/tags
// @desc    Search for videos with matching tags
// @access  Private
router.get('/search/tags', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ msg: 'Search query is required' });
    }
    
    // Get all playlists for this user
    const userPlaylists = await Playlist.find({ userId: req.user.id });
    const playlistIds = userPlaylists.map(playlist => playlist._id);
    
    // Find videos with tags containing the query string
    // Using case-insensitive search with regex
    const videos = await Video.find({
      playlistId: { $in: playlistIds },
      tags: { $regex: query, $options: 'i' }
    })
    .select('title ytId status timeSpent notes thumbnail duration viewCount tags playlistId')
    .limit(100);  // Limit results to prevent overwhelming response
    
    // Get playlist info for each video
    const playlistMap = {};
    for (const vid of videos) {
      if (!playlistMap[vid.playlistId]) {
        const pl = await Playlist.findById(vid.playlistId).select('name');
        playlistMap[vid.playlistId] = pl ? pl.name : 'Unknown Playlist';
      }
    }
    
    // Format response
    const formattedVideos = videos.map(video => ({
      id: video._id,
      title: video.title,
      ytId: video.ytId,
      status: video.status,
      timeSpent: video.timeSpent,
      notes: video.notes,
      thumbnail: video.thumbnail,
      duration: video.duration,
      viewCount: video.viewCount,
      tags: video.tags || [],
      playlistId: video.playlistId,
      playlistName: playlistMap[video.playlistId]
    }));
    
    res.json({
      count: formattedVideos.length,
      videos: formattedVideos
    });
  } catch (err) {
    console.error('Error searching tags:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/video/:id/resources
// @desc    Add a resource to a video
// @access  Private
router.post('/:id/resources', authenticateToken, async (req, res) => {
  try {
    const { title, url, type } = req.body;
    
    // Validate request
    if (!title || !url) {
      return res.status(400).json({ msg: 'Title and URL are required' });
    }
    
    // Find the video
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Ensure the video belongs to a playlist owned by the user
    const playlist = await Playlist.findOne({
      _id: video.playlistId,
      userId: req.user.id
    });
    
    if (!playlist) {
      return res.status(403).json({ msg: 'Not authorized to update this video' });
    }
    
    // Create new resource
    const newResource = {
      title,
      url,
      type: type || 'other'
    };
    
    // Add resource to video
    video.resources.push(newResource);
    await video.save();
    
    // Clear cache
    await deleteCache(`video:${video._id}`);
    
    res.json({ 
      success: true, 
      resources: video.resources 
    });
  } catch (err) {
    console.error('Error adding resource to video:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   DELETE /api/video/:id/resources/:resourceId
// @desc    Delete a resource from a video
// @access  Private
router.delete('/:id/resources/:resourceId', authenticateToken, async (req, res) => {
  try {
    // Find the video
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Ensure the video belongs to a playlist owned by the user
    const playlist = await Playlist.findOne({
      _id: video.playlistId,
      userId: req.user.id
    });
    
    if (!playlist) {
      return res.status(403).json({ msg: 'Not authorized to update this video' });
    }
    
    // Find the resource by its MongoDB ObjectId
    const resourceIndex = video.resources.findIndex(
      resource => resource._id.toString() === req.params.resourceId
    );
    
    if (resourceIndex === -1) {
      return res.status(404).json({ msg: 'Resource not found' });
    }
    
    // Remove the resource
    video.resources.splice(resourceIndex, 1);
    await video.save();
    
    // Clear cache
    await deleteCache(`video:${video._id}`);
    
    res.json({ 
      success: true, 
      resources: video.resources 
    });
  } catch (err) {
    console.error('Error deleting resource from video:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT /api/video/:id/resources/:resourceId
// @desc    Update a resource
// @access  Private
router.put('/:id/resources/:resourceId', authenticateToken, async (req, res) => {
  try {
    const { title, url, type } = req.body;
    
    // Find the video
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Ensure the video belongs to a playlist owned by the user
    const playlist = await Playlist.findOne({
      _id: video.playlistId,
      userId: req.user.id
    });
    
    if (!playlist) {
      return res.status(403).json({ msg: 'Not authorized to update this video' });
    }
    
    // Find the resource by its MongoDB ObjectId
    const resourceIndex = video.resources.findIndex(
      resource => resource._id.toString() === req.params.resourceId
    );
    
    if (resourceIndex === -1) {
      return res.status(404).json({ msg: 'Resource not found' });
    }
    
    // Update the resource
    if (title) video.resources[resourceIndex].title = title;
    if (url) video.resources[resourceIndex].url = url;
    if (type) video.resources[resourceIndex].type = type;
    
    await video.save();
    
    // Clear cache
    await deleteCache(`video:${video._id}`);
    
    res.json({ 
      success: true, 
      resources: video.resources 
    });
  } catch (err) {
    console.error('Error updating resource:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/video/search/notes
// @desc    Search for videos with matching notes content
// @access  Private
router.get('/search/notes', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ msg: 'Search query is required' });
    }
    
    // Get all playlists for this user
    const userPlaylists = await Playlist.find({ userId: req.user.id });
    const playlistIds = userPlaylists.map(playlist => playlist._id);
    
    // Find videos with notes containing the query string
    // Using case-insensitive search with regex
    const videos = await Video.find({
      playlistId: { $in: playlistIds },
      notes: { $regex: query, $options: 'i' }
    })
    .select('title ytId status timeSpent notes thumbnail duration viewCount tags playlistId')
    .limit(100);  // Limit results to prevent overwhelming response
    
    // Get playlist info for each video
    const playlistMap = {};
    for (const vid of videos) {
      if (!playlistMap[vid.playlistId]) {
        const pl = await Playlist.findById(vid.playlistId).select('name');
        playlistMap[vid.playlistId] = pl ? pl.name : 'Unknown Playlist';
      }
    }
    
    // Format response
    const formattedVideos = videos.map(video => ({
      id: video._id,
      title: video.title,
      ytId: video.ytId,
      status: video.status,
      timeSpent: video.timeSpent,
      // Include a snippet of the matched notes with context
      notes: video.notes && video.notes.length > 300 
        ? highlightMatchedText(video.notes, query, 300)
        : video.notes,
      thumbnail: video.thumbnail,
      duration: video.duration,
      viewCount: video.viewCount,
      tags: video.tags || [],
      playlistId: video.playlistId,
      playlistName: playlistMap[video.playlistId]
    }));
    
    res.json({
      count: formattedVideos.length,
      videos: formattedVideos
    });
  } catch (err) {
    console.error('Error searching notes:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * Create a snippet of text with the matched query highlighted
 * @param {string} text - The full text to search in
 * @param {string} query - The search query
 * @param {number} maxLength - Maximum length of the snippet
 * @returns {string} - Formatted snippet with context
 */
function highlightMatchedText(text, query, maxLength) {
  // Find the first occurrence of the query (case insensitive)
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) {
    // If not found (which shouldn't happen), return the beginning of the text
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  // Calculate start and end positions for the snippet
  let start = Math.max(0, index - 100);
  let end = Math.min(text.length, index + query.length + 100);
  
  // Adjust if the snippet would be too long
  if (end - start > maxLength) {
    const halfLength = Math.floor(maxLength / 2);
    start = Math.max(0, index - halfLength);
    end = Math.min(text.length, index + query.length + halfLength);
  }
  
  // Add ellipsis if we're not at the beginning/end of the full text
  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += text.substring(start, end);
  if (end < text.length) snippet += '...';
  
  return snippet;
}

// @route   POST /api/video
// @desc    Add a new video
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { playlistId, ytId, title, description, thumbnail, duration, viewCount, likeCount, publishedAt, channelTitle } = req.body;
    
    // Check if playlist exists and is custom
    const playlist = await Playlist.findOne({
      _id: playlistId,
      userId: req.user.id
    });

    if (!playlist) {
      return res.status(404).json({ msg: 'Playlist not found' });
    }

    if (!playlist.isCustomPlaylist) {
      return res.status(403).json({ msg: 'Cannot add videos to non-custom playlists' });
    }
    
    // Parse timestamps from description
    const timestamps = parseTimestamps(description);
    
    const video = new Video({
      playlistId,
      ytId,
      title,
      description,
      thumbnail,
      duration,
      viewCount,
      likeCount,
      publishedAt,
      channelTitle,
      timestamps
    });
    
    await video.save();

    // Add video to playlist's videos array
    playlist.videos.push(video._id);
    await playlist.save();
    
    res.status(201).json(video);
  } catch (err) {
    console.error('Error adding video:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   DELETE /api/video/:id/remove-from-playlist
// @desc    Remove a video from a custom playlist
// @access  Private
router.delete('/:id/remove-from-playlist', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Find the video
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    
    // Find the playlist
    const playlist = await Playlist.findOne({
      _id: video.playlistId,
      userId: req.user.id
    });
    
    if (!playlist) {
      return res.status(404).json({ msg: 'Playlist not found' });
    }
    
    // Check if it's a custom playlist
    if (!playlist.isCustomPlaylist) {
      return res.status(403).json({ msg: 'Cannot remove videos from non-custom playlists' });
    }
    
    // Remove video from playlist's videos array
    playlist.videos = playlist.videos.filter(vid => vid.toString() !== videoId);
    await playlist.save();
    
    // Delete the video
    await Video.findByIdAndDelete(videoId);
    
    // Clear cache
    await deleteCache(`video:${videoId}`);
    await deleteCache(`playlist:${playlist._id}`);
    
    res.json({ 
      success: true,
      msg: 'Video removed from playlist successfully'
    });
  } catch (err) {
    console.error('Error removing video from playlist:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router; 