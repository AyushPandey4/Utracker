const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const badgeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  iconUrl: {
    type: String
  },
  dateEarned: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Badge', badgeSchema); 