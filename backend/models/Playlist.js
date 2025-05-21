const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const playlistSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  ytPlaylistUrl: {
    type: String,
    required: false,
    default: ''
  },
  ytPlaylistId: {
    type: String,
    required: false,
    default: ''
  },
  isCustomPlaylist: {
    type: Boolean,
    default: false
  },
  ytInfo: {
    title: String,
    description: String,
    thumbnail: String,
    channelTitle: String,
    itemCount: Number,
    publishedAt: String
  },
  videos: [{
    type: Schema.Types.ObjectId,
    ref: 'Video'
  }],
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Playlist', playlistSchema); 