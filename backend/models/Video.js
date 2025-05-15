const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const videoSchema = new Schema({
  playlistId: {
    type: Schema.Types.ObjectId,
    ref: 'Playlist',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  ytId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['to-watch', 'in-progress', 'completed'],
    default: 'to-watch'
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  },
  aiSummary: {
    type: String
  },
  aiSummaryGenerated: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', videoSchema); 