class ReplyResponse {
  constructor(reply) {
    this._id = reply._id;
    this.content = reply.content;
    this.answer = reply.answer;
    this.parent = reply.parent;
    this.user = {
      _id: reply.user._id,
      name: reply.user.name,
      avatarUrl: reply.user.avatarUrl || '/assets/images/defaultavatar.png',
    };
    this.upvotedBy = reply.upvotedBy || [];
    this.downvotedBy = reply.downvotedBy || [];
    this.createdAt = reply.createdAt;
    this.updatedAt = reply.updatedAt;
    this.children = reply.children || [];
  }

  static fromReply(reply) {
    return new ReplyResponse(reply);
  }

  static fromReplyList(replies) {
    return replies.map((reply) => new ReplyResponse(reply));
  }
}

class ReplyListResponse {
  static fromServiceResponse(serviceResult, page, limit) {
    return {
      replies: serviceResult.replies.map((r) => ({
        ...r,
        totalChildren: r.totalChildren || 0,
        hasMoreChildren: r.hasMoreChildren || false,
      })),
      totalCount: serviceResult.totalItems,
      hasMore: serviceResult.hasMore,
      page,
      limit,
    };
  }
}

class VoteStatusResponse {
  constructor(upvoted, downvoted) {
    this.upvoted = upvoted;
    this.downvoted = downvoted;
  }

  static fromVoteStatus(voteStatus) {
    return new VoteStatusResponse(voteStatus.upvoted, voteStatus.downvoted);
  }
}

class OwnershipResponse {
  constructor(isOwner) {
    this.isOwner = isOwner;
  }

  static fromOwnership(isOwner) {
    return new OwnershipResponse(isOwner);
  }
}

module.exports = {
  ReplyResponse,
  ReplyListResponse,
  VoteStatusResponse,
  OwnershipResponse,
};
