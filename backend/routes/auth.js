const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const { setCache, getCache } = require('../config/redisUtils');

// Create a new OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @route   POST api/auth/google
// @desc    Authenticate user & get token
// @access  Public
router.post('/google', async (req, res) => {
  const { tokenId, userData } = req.body;
  
  try {
    let email, name, picture;
    
    // If userData is provided directly (from frontend)
    if (userData && userData.email) {
      // console.log('Using provided user data from frontend');
      ({ email, name, picture } = { 
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      });
    } 
    // If we have a tokenId, verify it using Google's API
    else if (tokenId) {
      // console.log('Verifying Google token');
      // Verify Google token
      const ticket = await client.verifyIdToken({
        idToken: tokenId,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      // Get user data from Google token
      ({ name, email, picture } = ticket.getPayload());
    } else {
      return res.status(400).json({ msg: 'No valid authentication data provided' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        name,
        email,
        avatar: picture,
        categories: [],
        dailyGoal: ''
      });

      await user.save();
    } else {
      // Update avatar if it has changed
      if (user.avatar !== picture) {
        user.avatar = picture;
        await user.save();
      }
    }

    // Create payload for JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    // Generate JWT
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      async (err, token) => {
        if (err) throw err;
        
        const userData = {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          categories: user.categories,
          dailyGoal: user.dailyGoal
        };
        
        // Cache user data in Redis
        await setCache(`user:${user.id}`, userData, 86400); // Cache for 24 hours
        
        res.json({
          token,
          user: userData
        });
      }
    );
  } catch (err) {
    console.error('Error in Google authentication:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', authenticateToken, async (req, res) => {
  try {
    // console.log('User ID from token:', req.user.id);   
    
    // Try to get user from Redis cache first
    const cachedUser = await getCache(`user:${req.user.id}`);
    
    if (cachedUser) {
      return res.json(cachedUser);
    }
    
    // If not in cache, get from database
    const user = await User.findById(req.user.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Cache the user data
    await setCache(`user:${user.id}`, user.toObject(), 86400); // Cache for 24 hours
    
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router; 