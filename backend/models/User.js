const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  avatar: {
    type: String
  },
  categories: [{
    type: String
  }],
  dailyGoal: {
    type: String
  },
  playlists: [{
    type: Schema.Types.ObjectId,
    ref: 'Playlist'
  }],
  badges: [{
    type: Schema.Types.ObjectId,
    ref: 'Badge'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema); 