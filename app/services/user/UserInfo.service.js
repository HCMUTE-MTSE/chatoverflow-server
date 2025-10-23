const User = require('../../models/User.model');
const Question = require('../../models/Question.model');
const Answer = require('../../models/Answer.model');
const Blog = require('../../models/Blog.model');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

async function updateUserInfo(userId, updateData) {
  try {
    const { name, nickName, dateOfBirth, address, gender, bio } = updateData;
    const user = await User.findById(userId);

    if (!user || user.status !== 'active') {
      return {
        success: false,
        message: !user
          ? 'Không tìm thấy người dùng'
          : 'Tài khoản chưa được kích hoạt',
      };
    }

    const updateFields = {};

    // Update basic info
    if (name && name !== user.name) updateFields.name = name;
    if (nickName && nickName !== user.nickName) {
      const existingUser = await User.findOne({
        nickName,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return { success: false, message: 'Tên hiển thị đã được sử dụng' };
      }
      updateFields.nickName = nickName;
    }
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (address !== undefined) updateFields.address = address;
    if (gender !== undefined) updateFields.gender = gender;
    if (bio !== undefined) updateFields.bio = bio;
    if (Object.keys(updateFields).length === 0) {
      return {
        success: false,
        message: 'Không có thông tin nào được cập nhật',
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    );

    return {
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: {
        userId: updatedUser._id,
        name: updatedUser.name,
        nickName: updatedUser.nickName,
        email: updatedUser.email,
        status: updatedUser.status,
        dateOfBirth: updatedUser.dateOfBirth,
        address: updatedUser.address,
        gender: updatedUser.gender,
        updatedAt: updatedUser.updatedAt,
      },
    };
  } catch (error) {
    console.error('Update user info error:', error);
    return {
      success: false,
      message: 'Lỗi hệ thống khi cập nhật thông tin 22',
    };
  }
}

async function getUserProfile(userId) {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid ObjectId:', userId);
      return {
        success: false,
        message: 'ID người dùng không hợp lệ',
      };
    }

    // Lấy thông tin user
    const user = await User.findById(userId).select(
      '-password -tempPasswordHash -__v'
    );

    if (!user || user.status !== 'active') {
      console.log('User not found or inactive, status:', user?.status);
      return {
        success: false,
        message: !user
          ? 'Không tìm thấy thông tin người dùng'
          : 'Tài khoản chưa được kích hoạt',
      };
    }

    // Đếm tổng số posts (chỉ những post không bị ẩn)
    const totalPosts = await Question.countDocuments({
      user: userId,
      isHidden: { $ne: true },
    });

    // Đếm tổng số answers (chỉ những answer không bị ẩn)
    const totalAnswers = await Answer.countDocuments({
      user: userId,
      isHidden: { $ne: true },
    });

    return {
      success: true,
      message: 'Lấy thông tin profile thành công',
      data: {
        user: {
          userId: user._id,
          name: user.name,
          avatar: user.avatar,
          nickName: user.nickName,
          email: user.email,
          status: user.status,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
          gender: user.gender,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          bio: user.bio,
          avatar: user.avatar,
        },
        statistics: {
          totalPosts,
          totalAnswers,
          totalContributions: totalPosts + totalAnswers,
        },
      },
    };
  } catch (error) {
    console.error('Get user profile error:', error);
    return {
      success: false,
      message: 'Lỗi hệ thống khi lấy thông tin profile',
    };
  }
}
async function getUserPosts(userId, page = 1, limit = 10) {
  try {
    // Validate ObjectId
    const skip = (page - 1) * limit;

    // Lấy danh sách posts của user với pagination (chỉ những post không bị ẩn)
    const posts = await Question.find({
      user: userId,
      isHidden: { $ne: true },
    })
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name nickName avatar')
      .select('title content tags askedTime views upvotedBy downvotedBy')
      .lean();

    // Lấy answerCount cho tất cả posts một lần (chỉ đếm answer không bị ẩn)
    const postIds = posts.map((post) => post._id);
    const answerCounts = await Answer.aggregate([
      {
        $match: {
          question: { $in: postIds },
          isHidden: { $ne: true },
        },
      },
      { $group: { _id: '$question', count: { $sum: 1 } } },
    ]);
    const answerCountMap = {};
    answerCounts.forEach((item) => {
      answerCountMap[item._id.toString()] = item.count;
    });
    posts.forEach((post) => {
      post.answerCount = answerCountMap[post._id.toString()] || 0;
    });
    // Tính toán thống kê cho mỗi post
    const postsWithStats = posts.map((post) => ({
      ...post,
      upvotes: post.upvotedBy ? post.upvotedBy.length : 0,
      downvotes: post.downvotedBy ? post.downvotedBy.length : 0,
      score:
        (post.upvotedBy ? post.upvotedBy.length : 0) -
        (post.downvotedBy ? post.downvotedBy.length : 0),
    }));

    return {
      success: true,
      message: 'Lấy danh sách bài viết thành công',
      data: {
        posts: postsWithStats,
        totalPosts: await Question.countDocuments({
          user: userId,
          isHidden: { $ne: true },
        }),
      },
    };
  } catch (error) {
    console.error('Get user posts error:', error);
    return {
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách bài viết',
    };
  }
}

async function getUserAnswers(userId, page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;
    const answers = await Answer.find({
      user: userId,
      isHidden: { $ne: true },
    })
      .sort({ createdAt: -1, _id: -1 })
      .populate('user', 'name nickName avatar')
      .populate('question', '_id')
      .skip(skip)
      .limit(limit)
      .select('question content createdAt upvotedBy downvotedBy')
      .lean();

    answers.forEach((ans) => {
      ans.question = ans.question?._id || ans.question;
    });
    const totalAnswers = await Answer.countDocuments({
      user: userId,
      isHidden: { $ne: true },
    });

    return {
      success: true,
      message: 'Lấy danh sách câu trả lời thành công',
      data: {
        answers,
        totalAnswers,
      },
    };
  } catch (error) {
    console.error('Get user answers error:', error);
    return {
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách câu trả lời',
    };
  }
}
async function getUserStatistics(userId) {
  try {
    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      return {
        success: false,
        message: !user
          ? 'Không tìm thấy người dùng'
          : 'Tài khoản chưa được kích hoạt',
      };
    }

    // Lấy thống kê cho người dùng (chỉ đếm những item không bị ẩn)
    const totalQuestions = await Question.countDocuments({
      user: userId,
      isHidden: { $ne: true },
    });
    const totalAnswers = await Answer.countDocuments({
      user: userId,
      isHidden: { $ne: true },
    });
    const totalBlogs = await Blog.countDocuments({ user: userId });
    const totalViewsAgg = await Question.aggregate([
      {
        $match: {
          user: user._id,
          isHidden: { $ne: true },
        },
      },
      { $group: { _id: null, totalViews: { $sum: '$views' } } },
    ]);
    const totalViews =
      totalViewsAgg.length > 0 ? totalViewsAgg[0].totalViews : 0;
    const totalVotesAgg = await Question.aggregate([
      {
        $match: {
          user: user._id,
          isHidden: { $ne: true },
        },
      },
      {
        $project: {
          upvotes: { $size: '$upvotedBy' },
          downvotes: { $size: '$downvotedBy' },
        },
      },
      {
        $group: {
          _id: null,
          totalUpvotes: { $sum: '$upvotes' },
          totalDownvotes: { $sum: '$downvotes' },
        },
      },
    ]);
    console.log('Total Votes Agg:', totalVotesAgg);
    const totalVotes =
      totalVotesAgg.length > 0
        ? totalVotesAgg[0].totalUpvotes + totalVotesAgg[0].totalDownvotes
        : 0;
    const joinDate = user.createdAt.toISOString().split('T')[0];

    // Lấy dữ liệu lịch sử hoạt động (số câu hỏi và câu trả lời theo ngày trong 30 ngày gần nhất)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // Thống kê số câu hỏi theo ngày
    const questionsByDate = await Question.aggregate([
      {
        $match: {
          user: user._id,
          createdAt: { $gte: thirtyDaysAgo },
          isHidden: { $ne: true },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalQuestions: { $sum: 1 },
        },
      },
    ]);

    // Thống kê số câu trả lời theo ngày
    const answersByDate = await Answer.aggregate([
      {
        $match: {
          user: user._id,
          createdAt: { $gte: thirtyDaysAgo },
          isHidden: { $ne: true },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalAnswers: { $sum: 1 },
        },
      },
    ]);

    // Thống kê blog theo ngày
    const blogsByDate = await Blog.aggregate([
      { $match: { user: user._id, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalBlogs: { $sum: 1 },
        },
      },
    ]);

    // Kết hợp dữ liệu cho từng ngày
    const historyData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const questionStats = questionsByDate.find(
        (item) => item._id === dateString
      );
      const answerStats = answersByDate.find((item) => item._id === dateString);
      const blogStats = blogsByDate.find((item) => item._id === dateString);

      historyData.push({
        date: dateString,
        questions: questionStats ? questionStats.totalQuestions : 0,
        answers: answerStats ? answerStats.totalAnswers : 0,
        blogs: blogStats ? blogStats.totalBlogs : 0,
        total:
          (questionStats ? questionStats.totalQuestions : 0) +
          (answerStats ? answerStats.totalAnswers : 0) +
          (blogStats ? blogStats.totalBlogs : 0),
      });
    }
    const responseData = {
      totalQuestions,
      totalAnswers,
      totalBlogs,
      totalViews,
      totalVotes,
      joinDate,
      historyData: historyData,
    };
    return {
      success: true,
      message: 'Lấy thông tin thống kê thành công',
      data: responseData,
    };
  } catch (error) {
    console.error('Get user statistics error:', error);
    return {
      success: false,
      message: 'Lỗi hệ thống khi lấy thông tin thống kê',
    };
  }
}

module.exports = {
  updateUserInfo,
  getUserProfile,
  getUserStatistics,
  getUserPosts,
  getUserAnswers,
};
