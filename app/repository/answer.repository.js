const mongoose = require('mongoose');
const Answer = require('../models/Answer.model');
const Reply = require('../models/Reply.model');
const {
  ANSWER_SORT_CONFIGS,
  DEFAULT_ANSWER_SORT,
} = require('../constants/filters/answer');

class AnswerRepository {
  /** Lấy danh sách answer theo question với phân trang và sorting */
  async findByQuestion(
    questionId,
    page = 1,
    limit = 10,
    sortBy = DEFAULT_ANSWER_SORT
  ) {
    const skip = (page - 1) * limit;
    const sortConfig =
      ANSWER_SORT_CONFIGS[sortBy] || ANSWER_SORT_CONFIGS[DEFAULT_ANSWER_SORT];

    let answers;
    let total;

    if (sortConfig.requiresAggregation) {
      // Use aggregation pipeline for complex sorting (like upvotes)
      const pipeline = [
        {
          $match: {
            question: new mongoose.Types.ObjectId(questionId),
            isHidden: { $ne: true },
          },
        },
        {
          $addFields: {
            upvoteCount: { $size: '$upvotedBy' },
            downvoteCount: { $size: '$downvotedBy' },
            netVotes: {
              $subtract: [{ $size: '$upvotedBy' }, { $size: '$downvotedBy' }],
            },
          },
        },
        { $sort: { netVotes: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [{ $project: { name: 1, avatar: 1 } }],
          },
        },
        { $unwind: '$user' },
      ];

      answers = await Answer.aggregate(pipeline);
      total = await Answer.countDocuments({
        question: questionId,
        isHidden: { $ne: true },
      });
    } else {
      // Use simple sorting for basic fields
      const sortObj = {};
      sortObj[sortConfig.sortField] = sortConfig.sortOrder;

      answers = await Answer.find({
        question: questionId,
        isHidden: { $ne: true },
      })
        .populate('user', 'name avatar')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      total = await Answer.countDocuments({
        question: questionId,
        isHidden: { $ne: true },
      });
    }

    return { answers, total };
  }

  /** Lấy tổng số answer theo questionId */
  async getTotalByQuestion(questionId) {
    return Answer.countDocuments({
      question: questionId,
      isHidden: { $ne: true },
    });
  }

  /** Tạo mới answer */
  async create(answerData) {
    const answer = new Answer(answerData);
    await answer.save();
    return answer.populate('user', 'name avatar');
  }

  /** Lấy answer theo ID */
  async findById(answerId, session) {
    const query = Answer.findById(answerId);
    if (session) {
      query.session(session);
    }
    return query;
  }
  /** Cập nhật content của answer */
  async updateContent(answerId, content, session) {
    const options = { new: true };
    if (session) {
      options.session = session;
    }
    return Answer.findByIdAndUpdate(answerId, { content }, options).populate(
      'user',
      'name avatar'
    );
  }
  /** Xóa answer theo ID */
  async deleteAnswer(answerId, session) {
    const query = Answer.deleteOne({ _id: answerId });
    if (session) {
      query.session(session);
    }
    return query;
  }
  /** Xóa tất cả reply liên quan đến answer */
  async deleteRepliesByAnswer(answerId, session) {
    const query = Reply.deleteMany({ answer: answerId });
    if (session) {
      query.session(session);
    }
    return query;
  }

  /** Kiểm tra xem user có phải owner của answer không */
  async isOwner(answerId, userId) {
    const answer = await Answer.findById(answerId).lean();
    if (!answer) return false;
    return answer.user.toString() === userId;
  }
}

module.exports = new AnswerRepository();
