const Reply = require('../models/Reply.model');
const Answer = require('../models/Answer.model');

class ReplyRepository {
  async create(data) {
    const reply = new Reply(data);
    return reply.save();
  }

  async findAnswerById(id) {
    return Answer.findById(id);
  }

  async findReplyById(id) {
    return Reply.findById(id);
  }

  async findReplyByIdWithUser(id) {
    return Reply.findById(id).populate('user', 'name avatarUrl').lean();
  }

  // 🔹 Thay vì chỉ filter answerId, thêm luôn parentId
  async findReplies(filter, skip, limit) {
    // Add isHidden filter to existing filter
    const finalFilter = {
      ...filter,
      isHidden: { $ne: true },
    };

    return Reply.find(finalFilter)
      .populate('user', 'name avatarUrl')
      .sort({ createdAt: 1 }) // ascending order for thread readability
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countReplies(filter) {
    // Add isHidden filter to existing filter
    const finalFilter = {
      ...filter,
      isHidden: { $ne: true },
    };

    return Reply.countDocuments(finalFilter);
  }

  async addUpvote(replyId, userId) {
    return Reply.findByIdAndUpdate(
      replyId,
      { $addToSet: { upvotedBy: userId } },
      { new: true }
    );
  }

  async removeUpvote(replyId, userId) {
    return Reply.findByIdAndUpdate(
      replyId,
      { $pull: { upvotedBy: userId } },
      { new: true }
    );
  }

  async addDownvote(replyId, userId) {
    return Reply.findByIdAndUpdate(
      replyId,
      { $addToSet: { downvotedBy: userId } },
      { new: true }
    );
  }

  async removeDownvote(replyId, userId) {
    return Reply.findByIdAndUpdate(
      replyId,
      { $pull: { downvotedBy: userId } },
      { new: true }
    );
  }

  async updateReply(replyId, updateData) {
    return Reply.findByIdAndUpdate(
      replyId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
  }

  async deleteReplyAndChildren(replyId) {
    const childrenIds = await this.findAllChildrenIds(replyId);
    const allIds = [replyId, ...childrenIds];
    return Reply.deleteMany({ _id: { $in: allIds } });
  }

  async findAllChildrenIds(parentId) {
    const children = await Reply.find(
      {
        parent: parentId,
        isHidden: { $ne: true },
      },
      '_id'
    ).lean();
    let allChildren = children.map((child) => child._id);

    for (const child of children) {
      const grandChildren = await this.findAllChildrenIds(child._id);
      allChildren = allChildren.concat(grandChildren);
    }

    return allChildren;
  }
}

module.exports = new ReplyRepository();
