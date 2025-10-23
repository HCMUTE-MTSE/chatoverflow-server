const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    answer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Answer',
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reply',
      default: null,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isHidden: { type: Boolean, default: false },
    hideReason: { type: String, default: null },
    hiddenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reply', ReplySchema);
