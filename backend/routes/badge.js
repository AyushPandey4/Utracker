const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const Video = require('../models/Video');
const Badge = require('../models/Badge');
const { setCache, getCache, deleteCache } = require('../config/redisUtils');

/**
 * Get all badges for a user
 * @param {string} userId - User ID 
 * @returns {Promise<Array>} - Array of badge objects
 */
const getUserBadges = async (userId) => {
  try {
    return await Badge.find({ userId }).sort({ dateEarned: -1 });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    throw error;
  }
};

/**
 * Check for first playlist badge
 * @param {string} userId - User ID
 */
const checkFirstPlaylistBadge = async (userId) => {
  try {
    // Count user's playlists
    const playlistCount = await Playlist.countDocuments({ userId });
    
    if (playlistCount > 0) {
      // Check if badge already exists
      const existingBadge = await Badge.findOne({
        userId,
        title: 'First Playlist Added'
      });
      
      if (!existingBadge) {
        // Create the badge
        const badge = new Badge({
          userId,
          title: 'First Playlist Added',
          description: 'You added your first playlist to track',
          iconUrl: '📋',
          dateEarned: new Date()
        });
        
        await badge.save();
        
        // Add badge to user
        await User.findByIdAndUpdate(userId, {
          $push: { badges: badge._id }
        });
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking first playlist badge:', error);
    return false;
  }
};

/**
 * Check for video completion milestones
 * @param {string} userId - User ID
 */
const checkVideoMilestoneBadges = async (userId) => {
  try {
    // Get all playlists for user
    const playlists = await Playlist.find({ userId }).select('_id');
    const playlistIds = playlists.map(p => p._id);
    
    // Count completed videos
    const completedCount = await Video.countDocuments({
      playlistId: { $in: playlistIds },
      status: 'completed'
    });
    
    // Define milestones
    const milestones = [
      { count: 10, title: '10 Videos Completed', icon: '🎓' },
      { count: 50, title: '50 Videos Completed', icon: '🏆' },
      { count: 100, title: '100 Videos Completed', icon: '🌟' }
    ];
    
    let badgesAdded = false;
    
    // Check each milestone
    for (const milestone of milestones) {
      if (completedCount >= milestone.count) {
        // Check if badge already exists
        const existingBadge = await Badge.findOne({
          userId,
          title: milestone.title
        });
        
        if (!existingBadge) {
          // Create the badge
          const badge = new Badge({
            userId,
            title: milestone.title,
            description: `You've completed ${milestone.count} videos. Keep up the great work!`,
            iconUrl: milestone.icon,
            dateEarned: new Date()
          });
          
          await badge.save();
          
          // Add badge to user
          await User.findByIdAndUpdate(userId, {
            $push: { badges: badge._id }
          });
          
          badgesAdded = true;
        }
      }
    }
    
    return badgesAdded;
  } catch (error) {
    console.error('Error checking video milestone badges:', error);
    return false;
  }
};

/**
 * Check for streak badges (consistency)
 * @param {string} userId - User ID
 */
const checkStreakBadges = async (userId) => {
  try {
    // This is a placeholder for streak badge logic
    // In a real implementation, you would track daily activity
    // and award badges for consistent usage (e.g. 7-day streak)
    
    // For now, we'll use a random chance to simulate this
    // In a real implementation, remove this and implement actual streak tracking
    const shouldAwardBadge = Math.random() > 0.7;
    
    if (shouldAwardBadge) {
      // Check if badge already exists
      const existingBadge = await Badge.findOne({
        userId,
        title: 'Consistency Champion'
      });
      
      if (!existingBadge) {
        // Create the badge
        const badge = new Badge({
          userId,
          title: 'Consistency Champion',
          description: 'You maintained a 7-day learning streak',
          iconUrl: '🔥',
          dateEarned: new Date()
        });
        
        await badge.save();
        
        // Add badge to user
        await User.findByIdAndUpdate(userId, {
          $push: { badges: badge._id }
        });
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking streak badges:', error);
    return false;
  }
};

/**
 * Check for completed playlists
 * @param {string} userId - User ID
 */
const checkPlaylistCompletionBadges = async (userId) => {
  try {
    // Get all playlists that are marked as completed but don't have badges yet
    const completedPlaylists = await Playlist.find({ 
      userId, 
      completed: true 
    });
    
    let badgesAdded = false;
    
    for (const playlist of completedPlaylists) {
      // Check if badge already exists for this playlist
      const existingBadge = await Badge.findOne({
        userId,
        title: `Completed: ${playlist.name}`
      });
      
      // Only create badge if it doesn't exist already
      if (!existingBadge) {
        // Create the badge
        const badge = new Badge({
          userId,
          title: `Completed: ${playlist.name}`,
          description: `Completed all videos in the "${playlist.name}" playlist`,
          iconUrl: '🏆',
          dateEarned: new Date()
        });
        
        await badge.save();
        
        // Add badge to user
        await User.findByIdAndUpdate(userId, {
          $push: { badges: badge._id }
        });
        
        badgesAdded = true;
      }
    }
    
    return badgesAdded;
  } catch (error) {
    console.error('Error checking playlist completion badges:', error);
    return false;
  }
};

// @route   GET /api/badge/my-badges
// @desc    Fetch all earned badges
// @access  Private
router.get('/my-badges', authenticateToken, async (req, res) => {
  try {
    // Check cache first
    const cacheKey = `badges:${req.user.id}`;
    const cachedBadges = await getCache(cacheKey);
    
    if (cachedBadges) {
      return res.json(cachedBadges);
    }
    
    // Get badges from database
    const badges = await getUserBadges(req.user.id);
    
    // Format response
    const formattedBadges = badges.map(badge => ({
      id: badge._id,
      title: badge.title,
      description: badge.description,
      iconUrl: badge.iconUrl,
      dateEarned: badge.dateEarned
    }));
    
    // Cache the result for 1 hour
    await setCache(cacheKey, formattedBadges, 3600);
    
    res.json(formattedBadges);
  } catch (err) {
    console.error('Error fetching badges:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/badge/check-badges
// @desc    Evaluate user progress & assign badges
// @access  Private
router.post('/check-badges', authenticateToken, async (req, res) => {
  try {
    let badgesAdded = false;
    const results = {
      newBadges: [],
      message: 'No new badges earned'
    };
    
    // Clear cache before checks to ensure fresh data
    await deleteCache(`badges:${req.user.id}`);
    
    // Run all badge checks
    const firstPlaylistBadge = await checkFirstPlaylistBadge(req.user.id);
    const videoMilestoneBadges = await checkVideoMilestoneBadges(req.user.id);
    const streakBadges = await checkStreakBadges(req.user.id);
    // Check for playlist completion badges - but don't duplicate existing ones
    const playlistCompletionBadges = await checkPlaylistCompletionBadges(req.user.id);
    
    badgesAdded = firstPlaylistBadge || videoMilestoneBadges || streakBadges || playlistCompletionBadges;
    
    // If badges were added, get the updated list
    if (badgesAdded) {
      const updatedBadges = await getUserBadges(req.user.id);
      
      results.newBadges = updatedBadges.map(badge => ({
        id: badge._id,
        title: badge.title,
        description: badge.description,
        iconUrl: badge.iconUrl,
        dateEarned: badge.dateEarned
      }));
      
      results.message = 'New badges earned! Check your collection.';
      
      // Update the user's badges in cache
      await setCache(`badges:${req.user.id}`, results.newBadges, 3600);
    }
    
    res.json(results);
  } catch (err) {
    console.error('Error checking badges:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/badge/all
// @desc    Show all possible badges (for frontend use)
// @access  Private
router.get('/all', authenticateToken, async (req, res) => {
  try {
    // This is a static list of all possible badges in the system
    // In a production system, this might be stored in the database
    const allPossibleBadges = [
      {
        title: 'First Playlist Added',
        description: 'You added your first playlist to track',
        iconUrl: '📋'
      },
      {
        title: '10 Videos Completed',
        description: 'You\'ve completed 10 videos',
        iconUrl: '🎓'
      },
      {
        title: '50 Videos Completed',
        description: 'You\'ve completed 50 videos',
        iconUrl: '🏆'
      },
      {
        title: '100 Videos Completed',
        description: 'You\'ve completed 100 videos',
        iconUrl: '🌟'
      },
      {
        title: 'Consistency Champion',
        description: 'You maintained a 7-day learning streak',
        iconUrl: '🔥'
      },
      {
        title: 'Playlist Master',
        description: 'You completed every video in a playlist',
        iconUrl: '🏆'
      }
    ];
    
    res.json(allPossibleBadges);
  } catch (err) {
    console.error('Error fetching all possible badges:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/badge/cleanup-duplicates
// @desc    Remove duplicate playlist completion badges
// @access  Private
router.post('/cleanup-duplicates', authenticateToken, async (req, res) => {
  try {
    // Get all the user's badges
    const allBadges = await Badge.find({ userId: req.user.id });
    
    // Group badges by title
    const badgesByTitle = {};
    allBadges.forEach(badge => {
      if (!badgesByTitle[badge.title]) {
        badgesByTitle[badge.title] = [];
      }
      badgesByTitle[badge.title].push(badge);
    });
    
    // Find titles with multiple badges (duplicates)
    const titlesWithDuplicates = Object.keys(badgesByTitle).filter(
      title => badgesByTitle[title].length > 1 && title.startsWith('Completed: ')
    );
    
    // Only keep the newest badge for each duplicate title
    const deletedBadgeIds = [];
    for (const title of titlesWithDuplicates) {
      // Sort badges by date (newest first)
      const badges = badgesByTitle[title].sort(
        (a, b) => new Date(b.dateEarned) - new Date(a.dateEarned)
      );
      
      // Keep the first one (newest), delete the rest
      for (let i = 1; i < badges.length; i++) {
        deletedBadgeIds.push(badges[i]._id);
        await Badge.findByIdAndDelete(badges[i]._id);
      }
      
      // Remove the deleted badge IDs from the user's badges array
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { badges: { $in: deletedBadgeIds } }
      });
    }
    
    // Clear cache to reflect the changes
    await deleteCache(`badges:${req.user.id}`);
    
    res.json({ 
      success: true, 
      message: `Removed ${deletedBadgeIds.length} duplicate badges`, 
      removedCount: deletedBadgeIds.length
    });
  } catch (err) {
    console.error('Error cleaning up duplicate badges:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/badge/sync
// @desc    Synchronize badges with playlists - ensuring consistency
// @access  Private
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    // Get all the user's playlists
    const playlists = await Playlist.find({ userId: req.user.id });
    
    // Get all the user's badges
    const badges = await Badge.find({ userId: req.user.id });
    
    // Find all playlist completion badges
    const playlistBadges = badges.filter(badge => badge.title.startsWith('Completed: '));
    
    // 1. Remove badges for playlists that no longer exist
    const playlistMap = {};
    playlists.forEach(playlist => {
      playlistMap[playlist.name] = playlist;
    });
    
    const orphanedBadges = [];
    for (const badge of playlistBadges) {
      const playlistName = badge.title.replace('Completed: ', '');
      if (!playlistMap[playlistName]) {
        orphanedBadges.push(badge._id);
        await Badge.findByIdAndDelete(badge._id);
      }
    }
    
    // Remove orphaned badge references from user
    if (orphanedBadges.length > 0) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { badges: { $in: orphanedBadges } }
      });
    }
    
    // 2. Check for duplicate playlist badges
    const uniqueBadgeTitles = new Set();
    const duplicateBadges = [];
    
    for (const badge of playlistBadges) {
      if (uniqueBadgeTitles.has(badge.title)) {
        duplicateBadges.push(badge._id);
        await Badge.findByIdAndDelete(badge._id);
      } else {
        uniqueBadgeTitles.add(badge.title);
      }
    }
    
    // Remove duplicate badge references from user
    if (duplicateBadges.length > 0) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { badges: { $in: duplicateBadges } }
      });
    }
    
    // 3. Add missing badges for completed playlists
    const completedPlaylists = playlists.filter(playlist => playlist.completed);
    const existingBadgeTitles = new Set(playlistBadges.map(badge => badge.title));
    
    const newBadges = [];
    for (const playlist of completedPlaylists) {
      const badgeTitle = `Completed: ${playlist.name}`;
      
      if (!existingBadgeTitles.has(badgeTitle)) {
        // Create the badge
        const badge = new Badge({
          userId: req.user.id,
          title: badgeTitle,
          description: `Completed all videos in the "${playlist.name}" playlist`,
          iconUrl: '🏆',
          dateEarned: new Date()
        });
        
        await badge.save();
        newBadges.push(badge);
        
        // Add badge to user
        await User.findByIdAndUpdate(req.user.id, {
          $push: { badges: badge._id }
        });
      }
    }
    
    // 4. Run other badge checks (first playlist, video milestones, etc.)
    await checkFirstPlaylistBadge(req.user.id);
    await checkVideoMilestoneBadges(req.user.id);
    await checkStreakBadges(req.user.id);
    
    // Clear cache
    await deleteCache(`badges:${req.user.id}`);
    
    // Get final updated badge list
    const updatedBadges = await getUserBadges(req.user.id);
    const formattedBadges = updatedBadges.map(badge => ({
      id: badge._id,
      title: badge.title,
      description: badge.description,
      iconUrl: badge.iconUrl,
      dateEarned: badge.dateEarned
    }));
    
    // Create response with counts of changes made
    res.json({
      success: true,
      message: 'Badges synchronized successfully',
      stats: {
        orphanedBadgesRemoved: orphanedBadges.length,
        duplicateBadgesRemoved: duplicateBadges.length,
        newBadgesAdded: newBadges.length,
        totalBadges: formattedBadges.length
      },
      badges: formattedBadges
    });
  } catch (err) {
    console.error('Error syncing badges:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router; 