const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
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

module.exports = mongoose.model('Answer', AnswerSchema);
