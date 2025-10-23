const Question = require('../models/Question.model');

async function getNewest(limit = 20) {
  return Question.find({ isHidden: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name avatar')
    .populate('answerCount');
}

async function getTrending(limit = 20) {
  return Question.aggregate([
    {
      $match: { isHidden: { $ne: true } },
    },
    {
      $addFields: {
        upvoteCount: { $size: '$upvotedBy' },
      },
    },
    {
      $lookup: {
        from: 'answers',
        localField: '_id',
        foreignField: 'question',
        as: 'answers',
      },
    },
    {
      $addFields: {
        answerCount: { $size: '$answers' },
      },
    },
    { $sort: { views: -1, upvoteCount: -1 } },
    { $limit: limit },
    {
      $project: {
        answers: 0,
      },
    },
  ]);
}

async function getUnanswered(limit = 20) {
  return Question.aggregate([
    {
      $match: { isHidden: { $ne: true } },
    },
    {
      $lookup: {
        from: 'answers',
        localField: '_id',
        foreignField: 'question',
        as: 'answers',
      },
    },
    { $match: { 'answers.0': { $exists: false } } },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $addFields: { answerCount: 0 },
    },
  ]);
}

async function getQuestionDetailById(id) {
  try {
    const question = await Question.findOne({
      _id: id,
      isHidden: { $ne: true },
    })
      .populate('user', 'name avatar')
      .populate({
        path: 'answerCount',
      })
      .exec();

    return question;
  } catch (err) {
    console.log('Failure raised at question.repository', err);
    return null;
  }
}

async function getQuestionsByUserId(userId) {
  const userQuestions = await Question.find({
    user: userId,
    isHidden: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .populate('user', 'name avatar')
    .populate('answerCount');
  return userQuestions;
}

async function getQuestionsByTag(tagName, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  // Find questions with the tag, ordered by popularity
  // Popularity = views + upvotes * 2 + answers * 3
  const questions = await Question.aggregate([
    {
      $match: {
        tags: { $in: [tagName] },
        isHidden: { $ne: true },
      },
    },
    {
      $lookup: {
        from: 'answers',
        localField: '_id',
        foreignField: 'question',
        as: 'answers',
      },
    },
    {
      $addFields: {
        answerCount: { $size: '$answers' },
        // Calculate popularity score
        popularityScore: {
          $add: [
            '$views',
            { $multiply: [{ $size: '$upvotedBy' }, 2] },
            { $multiply: [{ $size: '$answers' }, 3] },
          ],
        },
      },
    },
    {
      $sort: { popularityScore: -1, createdAt: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    {
      $unwind: {
        path: '$userInfo',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        title: 1,
        content: 1,
        tags: 1,
        views: 1,
        upvotedBy: 1,
        downvotedBy: 1,
        answerCount: 1,
        askedTime: 1,
        createdAt: 1,
        updatedAt: 1,
        user: {
          _id: '$userInfo._id',
          name: '$userInfo.name',
          avatar: '$userInfo.avatar',
        },
      },
    },
  ]);

  // Get total count for pagination
  const totalCount = await Question.countDocuments({
    tags: { $in: [tagName] },
    isHidden: { $ne: true },
  });

  return {
    questions,
    totalCount,
  };
}

async function getUserVotedQuestions(userId) {
  const questions = await Question.find({
    upvotedBy: userId,
    isHidden: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .populate('user', 'name avatar')
    .populate('answerCount');
  return questions;
}
module.exports = {
  getNewest,
  getTrending,
  getUnanswered,
  getQuestionDetailById,
  getQuestionsByUserId,
  getQuestionsByTag,
  getUserVotedQuestions,
};
