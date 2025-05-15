const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const Video = require('../models/Video');
const Playlist = require('../models/Playlist');
const User = require('../models/User');
const Badge = require('../models/Badge');
const { setCache, getCache, deleteCache } = require('../config/redisUtils');
const { generateVideoSummary } = require('../services/aiService');

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
    const playlist = await Playlist.findById(video.playlistId).select('name category');
    
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
      createdAt: video.createdAt
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
    if (!status || !['to-watch', 'in-progress', 'completed'].includes(status)) {
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

module.exports = router; 