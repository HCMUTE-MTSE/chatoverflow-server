const Question = require('../../models/Question.model');
const Blog = require('../../models/Blog.model');

/**
 * Build date filter for MongoDB queries
 */
const buildDateFilter = (dateRange) => {
  const now = new Date();
  let startDate;

  switch (dateRange) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return null;
  }

  return { $gte: startDate };
};

/**
 * Build MongoDB match query from search parameters
 */
const buildMatchQuery = (query, filters, contentType = 'question') => {
  const matchQuery = {};

  // Only filter hidden content for questions
  if (contentType === 'question') {
    matchQuery.isHidden = { $ne: true };
  }

  // Text search
  if (query?.trim()) {
    matchQuery.$text = {
      $search: query,
      $caseSensitive: false,
    };
  }

  // Date range filter
  if (filters.dateRange) {
    const dateFilter = buildDateFilter(filters.dateRange);
    if (dateFilter) {
      matchQuery.createdAt = dateFilter;
    }
  }

  // Tags filter
  if (filters.tags?.length > 0) {
    matchQuery.tags = { $in: filters.tags };
  }

  return matchQuery;
};

/**
 * Build MongoDB sort object
 */
const buildSort = (sortBy, hasTextSearch) => {
  switch (sortBy) {
    case 'date':
      return { createdAt: -1 };
    case 'votes':
      return { voteScore: -1, createdAt: -1 };
    case 'relevance':
    default:
      if (hasTextSearch) {
        return { score: { $meta: 'textScore' }, createdAt: -1 };
      }
      return { createdAt: -1 };
  }
};

/**
 * Search Questions with aggregation pipeline
 */
exports.searchQuestions = async ({ query, filters, sortBy, page, limit }) => {
  const matchQuery = buildMatchQuery(query, filters, 'question');
  const hasTextSearch = query?.trim();
  const sort = buildSort(sortBy, hasTextSearch);
  const skip = (page - 1) * limit;

  const pipeline = [
    // Match stage
    ...(Object.keys(matchQuery).length > 0 ? [{ $match: matchQuery }] : []),

    // Add computed fields
    {
      $addFields: {
        upvoteCount: { $size: '$upvotedBy' },
        downvoteCount: { $size: '$downvotedBy' },
        voteScore: {
          $subtract: [{ $size: '$upvotedBy' }, { $size: '$downvotedBy' }],
        },
        ...(hasTextSearch && sortBy === 'relevance'
          ? { score: { $meta: 'textScore' } }
          : {}),
      },
    },

    // Apply minVotes filter if specified
    ...(filters.minVotes > 0
      ? [{ $match: { voteScore: { $gte: filters.minVotes } } }]
      : []),

    // Sort
    { $sort: sort },

    // Pagination
    { $skip: skip },
    { $limit: limit },

    // Lookup author
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'author',
        pipeline: [{ $project: { username: 1, avatar: 1, reputation: 1 } }],
      },
    },

    // Lookup answers count (only non-hidden answers)
    {
      $lookup: {
        from: 'answers',
        localField: '_id',
        foreignField: 'question',
        as: 'answers',
        pipeline: [{ $match: { isHidden: { $ne: true } } }],
      },
    },

    // Final field transformations
    {
      $addFields: {
        author: { $arrayElemAt: ['$author', 0] },
        answerCount: { $size: '$answers' },
      },
    },

    // Remove unnecessary fields
    {
      $project: {
        answers: 0,
        upvotedBy: 0,
        downvotedBy: 0,
      },
    },
  ];

  // Execute aggregation and count in parallel
  const [results, totalCount] = await Promise.all([
    Question.aggregate(pipeline),
    Question.countDocuments(matchQuery),
  ]);

  return { results, totalCount };
};

/**
 * Search Blogs with aggregation pipeline
 */
exports.searchBlogs = async ({ query, filters, sortBy, page, limit }) => {
  const matchQuery = buildMatchQuery(query, filters, 'blog');
  const hasTextSearch = query?.trim();
  const sort = buildSort(sortBy, hasTextSearch);
  const skip = (page - 1) * limit;

  const pipeline = [
    // Match stage
    ...(Object.keys(matchQuery).length > 0 ? [{ $match: matchQuery }] : []),

    // Add computed fields
    {
      $addFields: {
        upvoteCount: { $size: '$upvotedBy' },
        downvoteCount: { $size: '$downvotedBy' },
        voteScore: {
          $subtract: [{ $size: '$upvotedBy' }, { $size: '$downvotedBy' }],
        },
        ...(hasTextSearch && sortBy === 'relevance'
          ? { score: { $meta: 'textScore' } }
          : {}),
      },
    },

    // Apply minVotes filter if specified
    ...(filters.minVotes > 0
      ? [{ $match: { voteScore: { $gte: filters.minVotes } } }]
      : []),

    // Sort
    { $sort: sort },

    // Pagination
    { $skip: skip },
    { $limit: limit },

    // Lookup author
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'author',
        pipeline: [{ $project: { username: 1, avatar: 1, reputation: 1 } }],
      },
    },

    // Final field transformations
    {
      $addFields: {
        author: { $arrayElemAt: ['$author', 0] },
      },
    },

    // Remove unnecessary fields
    {
      $project: {
        upvotedBy: 0,
        downvotedBy: 0,
      },
    },
  ];

  // Execute aggregation and count in parallel
  const [results, totalCount] = await Promise.all([
    Blog.aggregate(pipeline),
    Blog.countDocuments(matchQuery),
  ]);

  return { results, totalCount };
};

/**
 * Get popular tags across Questions and Blogs
 */
exports.getPopularTags = async (limit = 20) => {
  const [questionTags, blogTags] = await Promise.all([
    Question.aggregate([
      { $match: { isHidden: { $ne: true } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
    ]),
    Blog.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
    ]),
  ]);

  // Merge and aggregate tags from both collections
  const tagMap = new Map();

  [...questionTags, ...blogTags].forEach(({ _id, count }) => {
    tagMap.set(_id, (tagMap.get(_id) || 0) + count);
  });

  // Convert to array and sort
  const tags = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return tags;
};
