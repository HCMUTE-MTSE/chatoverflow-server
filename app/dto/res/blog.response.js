class BlogItemResponse {
  constructor({
    id,
    coverImage,
    title,
    slug,
    summary,
    author,
    tags,
    upvotes,
    downvotes,
    createdAt,
  }) {
    this.id = id;
    this.coverImage = coverImage;
    this.title = title;
    this.slug = slug;
    this.summary = summary;
    this.author = author; // { avatar, nickName }
    this.tags = tags;
    this.upvotes = upvotes;
    this.downvotes = downvotes;
    this.createdAt = createdAt;
  }
}

const NewBlogItemResponse = (blog) =>
  new BlogItemResponse({
    id: blog._id,
    coverImage: blog.coverImage,
    title: blog.title,
    slug: blog.slug,
    summary: blog.summary,
    author: {
      userId: blog.user?._id,
      avatar: blog.user?.avatar,
      nickName: blog.user?.nickName,
    },
    tags: blog.tags || [],
    upvotes: blog.upvotedBy?.length || 0,
    downvotes: blog.downvotedBy?.length || 0,
    createdAt: blog.createdAt,
  });

class BlogDetailResponse {
  constructor({
    id,
    coverImage,
    title,
    contentHtml,
    author,
    tags,
    upvotes,
    downvotes,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.coverImage = coverImage;
    this.title = title;
    this.contentHtml = contentHtml;
    this.author = author; // { avatar, nickName }
    this.tags = tags;
    this.upvotes = upvotes;
    this.downvotes = downvotes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

const NewBlogDetailResponse = (blog) =>
  new BlogDetailResponse({
    id: blog._id,
    coverImage: blog.coverImage,
    title: blog.title,
    contentHtml: blog.content_html,
    author: {
      userId: blog.user?._id,
      avatar: blog.user?.avatar,
      nickName: blog.user?.nickName,
    },
    tags: blog.tags || [],
    upvotes: blog.upvotedBy?.length || 0,
    downvotes: blog.downvotedBy?.length || 0,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
  });

module.exports = {
  BlogItemResponse,
  NewBlogItemResponse,
  BlogDetailResponse,
  NewBlogDetailResponse,
};
