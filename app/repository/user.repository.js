const User = require('../models/User.model');
class UserRepository {
  async aggregateUsers({ page, limit, sortStage, search }) {
    const skip = (page - 1) * limit;

    const matchStage = {
      status: { $in: ['active'] },
    };

    if (search) {
      matchStage.name = { $regex: search, $options: 'i' };
    }

    return User.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'questions',
          localField: '_id',
          foreignField: 'user',
          as: 'questions',
          pipeline: [{ $match: { isHidden: { $ne: true } } }],
        },
      },
      {
        $lookup: {
          from: 'answers',
          localField: '_id',
          foreignField: 'user',
          as: 'answers',
          pipeline: [{ $match: { isHidden: { $ne: true } } }],
        },
      },
      {
        $addFields: {
          questionsCount: { $size: '$questions' },
          answersCount: { $size: '$answers' },
        },
      },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          password: 0,
          tempPasswordHash: 0,
          __v: 0,
          questions: 0,
          answers: 0,
        },
      },
    ]);
  }

  async countUsers(search) {
    const query = {
      status: { $in: ['active'] },
    };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    return User.countDocuments(query);
  }
}

module.exports = new UserRepository();
