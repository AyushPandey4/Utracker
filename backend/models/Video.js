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
  description: {
    type: String,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  duration: {
    type: String,
    default: ''
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: String,
    default: ''
  },
  channelTitle: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['to-watch', 'in-progress', 'completed', 'rewatch'],
    default: 'to-watch'
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  aiSummary: {
    type: String,
    default: ''
  },
  aiSummaryGenerated: {
    type: Boolean,
    default: false
  },
  tags: {
    type: [String],
    default: []
  },
  resources: {
    type: [{
      title: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['github', 'docs', 'notes', 'article', 'other'],
        default: 'other'
      }
    }],
    default: []
  },
  pinned: {
    type: Boolean,
    default: false
  },
  position: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', videoSchema); 