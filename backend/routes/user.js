const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const Video = require('../models/Video');
const { setCache, getCache, deleteCache } = require('../config/redisUtils');

// @route   POST /api/user/category
// @desc    Create new category
// @access  Private
router.post('/category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({ msg: 'Category name is required' });
    }
    
    // Find user and update categories
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if category already exists
    if (user.categories.includes(category)) {
      return res.status(400).json({ msg: 'Category already exists' });
    }
    
    // Add new category
    user.categories.push(category);
    await user.save();
    
    // Update cache
    await deleteCache(`user:${user.id}`);
    await deleteCache(`categories:${user.id}`);
    await setCache(`categories:${user.id}`, user.categories, 86400);
    
    res.json(user.categories);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/user/categories
// @desc    Fetch user's categories
// @access  Private
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    // Try to get categories from cache
    const cachedCategories = await getCache(`categories:${req.user.id}`);
    
    if (cachedCategories) {
      return res.json(cachedCategories);
    }
    
    // If not in cache, get from database
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Cache the categories
    await setCache(`categories:${user.id}`, user.categories, 86400);
    
    res.json(user.categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT /api/user/category
// @desc    Rename a category
// @access  Private
router.put('/category', authenticateToken, async (req, res) => {
  try {
    const { oldCategory, newCategory } = req.body;
    
    if (!oldCategory || !newCategory) {
      return res.status(400).json({ msg: 'Both old and new category names are required' });
    }
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if old category exists
    if (!user.categories.includes(oldCategory)) {
      return res.status(400).json({ msg: 'Category does not exist' });
    }
    
    // Check if new category already exists
    if (user.categories.includes(newCategory)) {
      return res.status(400).json({ msg: 'New category name already exists' });
    }
    
    // Update user's category
    const categoryIndex = user.categories.indexOf(oldCategory);
    user.categories[categoryIndex] = newCategory;
    await user.save();
    
    // Update all playlists with this category
    await Playlist.updateMany(
      { userId: req.user.id, category: oldCategory },
      { category: newCategory }
    );
    
    // Update cache
    await deleteCache(`user:${user.id}`);
    await deleteCache(`categories:${user.id}`);
    await deleteCache(`playlists:${user.id}`);
    await setCache(`categories:${user.id}`, user.categories, 86400);
    
    res.json(user.categories);
  } catch (err) {
    console.error('Error renaming category:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   DELETE /api/user/category/:categoryName
// @desc    Delete a category
// @access  Private
router.delete('/category/:categoryName', authenticateToken, async (req, res) => {
  try {
    const categoryName = req.params.categoryName;
    const deleteAssociatedPlaylists = req.query.deleteAssociatedPlaylists === 'true';
    
    if (!categoryName) {
      return res.status(400).json({ msg: 'Category name is required' });
    }
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if category exists
    if (!user.categories.includes(categoryName)) {
      return res.status(400).json({ msg: 'Category does not exist' });
    }
    
    // Check if there are playlists using this category
    const playlistsWithCategory = await Playlist.find({
      userId: req.user.id,
      category: categoryName
    });
    
    const playlistCount = playlistsWithCategory.length;
    
    if (playlistCount > 0 && !deleteAssociatedPlaylists) {
      return res.status(400).json({ 
        msg: 'This category has associated playlists. Set deleteAssociatedPlaylists=true to delete them along with the category.',
        hasPlaylists: true,
        count: playlistCount
      });
    }
    
    // If we should delete associated playlists
    if (deleteAssociatedPlaylists && playlistCount > 0) {
      // Get playlist IDs to remove from user
      const playlistIds = playlistsWithCategory.map(playlist => playlist._id);
      
      // Remove playlists from user
      user.playlists = user.playlists.filter(
        id => !playlistIds.some(playlistId => playlistId.equals(id))
      );
      
      // Delete all videos associated with these playlists
      for (const playlist of playlistsWithCategory) {
        await Video.deleteMany({ playlistId: playlist._id });
      }
      
      // Delete all playlists in this category
      await Playlist.deleteMany({
        userId: req.user.id,
        category: categoryName
      });
    }
    
    // Remove category
    user.categories = user.categories.filter(cat => cat !== categoryName);
    await user.save();
    
    // Update cache
    await deleteCache(`user:${user.id}`);
    await deleteCache(`categories:${user.id}`);
    await deleteCache(`playlists:${user.id}`);
    await setCache(`categories:${user.id}`, user.categories, 86400);
    
    res.json({
      categories: user.categories,
      deletedPlaylistsCount: deleteAssociatedPlaylists ? playlistCount : 0
    });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/user/daily-goal
// @desc    Set/update current daily goal
// @access  Private
router.post('/daily-goal', authenticateToken, async (req, res) => {
  try {
    const { dailyGoal } = req.body;
    
    if (dailyGoal === undefined) {
      return res.status(400).json({ msg: 'Daily goal is required' });
    }
    
    // Find user and update daily goal
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { dailyGoal },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Update cache
    await deleteCache(`user:${user.id}`);
    await setCache(`daily-goal:${user.id}`, user.dailyGoal, 86400);
    
    res.json({ dailyGoal: user.dailyGoal });
  } catch (err) {
    console.error('Error updating daily goal:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/user/daily-goal
// @desc    Fetch current daily goal
// @access  Private
router.get('/daily-goal', authenticateToken, async (req, res) => {
  try {
    // Try to get daily goal from cache
    const cachedDailyGoal = await getCache(`daily-goal:${req.user.id}`);
    
    if (cachedDailyGoal !== null) {
      return res.json({ dailyGoal: cachedDailyGoal });
    }
    
    // If not in cache, get from database
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Cache the daily goal
    await setCache(`daily-goal:${user.id}`, user.dailyGoal, 86400);
    
    res.json({ dailyGoal: user.dailyGoal });
  } catch (err) {
    console.error('Error fetching daily goal:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router; 