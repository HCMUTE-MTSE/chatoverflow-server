class CommentResponse {
  constructor({
    id,
    content,
    author,
    upvotes,
    downvotes,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.content = content;
    this.author = author; // { avatar, nickName }
    this.upvotes = upvotes;
    this.downvotes = downvotes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

const NewCommentResponse = (comment) =>
  new CommentResponse({
    id: comment._id,
    content: comment.content,
    author: {
      userId: comment.user?._id,
      avatar: comment.user?.avatar,
      nickName: comment.user?.nickName,
    },
    upvotes: comment.upvotedBy?.length || 0,
    downvotes: comment.downvotedBy?.length || 0,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  });

module.exports = {
  CommentResponse,
  NewCommentResponse,
};
