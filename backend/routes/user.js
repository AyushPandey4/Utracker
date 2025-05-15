const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
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