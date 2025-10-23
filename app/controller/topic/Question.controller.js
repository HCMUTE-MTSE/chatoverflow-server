const questionService = require('../../services/topic/question.service');
const ApiResponse = require('../../dto/res/api.response');
const Question = require('../../models/Question.model');

async function getQuestions(req, res) {
  try {
    const { type } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const { questions, totalItems } = await questionService.getQuestionsByType(
      type,
      limit,
      page
    );

    if (!questions) {
      return res
        .status(400)
        .json(
          ApiResponse.error('Invalid type. Use newest | trending | unanswer')
        );
    }

    const baseUrl = process.env.BACKEND_BASE_URL;

    return res.json(
      ApiResponse.withPagination(
        `Get questions by type: ${type}`,
        questions,
        page,
        limit,
        baseUrl,
        totalItems
      )
    );
  } catch (err) {
    console.error('❌ Error in getQuestions:', err);
    return res
      .status(500)
      .json(ApiResponse.error('Internal server error', err.message));
  }
}

async function getQuestionDetail(req, res) {
  try {
    const { id } = req.params;

    // First check if question exists (including hidden ones)
    const questionExists = await Question.findById(id);

    if (!questionExists) {
      return res
        .status(404)
        .json(
          ApiResponse.error(
            'Question not found, failure rasied at Question.controller'
          )
        );
    }

    // Check if question is hidden
    if (questionExists.isHidden) {
      // Set cache control headers for error responses too
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });

      return res
        .status(410)
        .json(
          ApiResponse.error(
            'Nội dung này hiện không khả dụng. Bài viết có thể đã bị ẩn hoặc xóa bởi người kiểm duyệt.'
          )
        );
    }

    // Get question detail using service
    const question = await questionService.getQuestionDetail(id);

    // Set cache control headers to prevent stale cache
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    return res.json(
      ApiResponse.success('Get question detail successfully', question)
    );
  } catch (err) {
    return res
      .status(500)
      .json(
        ApiResponse.error(
          'Internal server error, failure rasied at Question.controller',
          err.message
        )
      );
  }
}

async function createQuestion(req, res) {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json(ApiResponse.error('Required fields are missing'));
    }

    const userId = req.userId;

    const question = await Question.create({
      title,
      content,
      tags,
      user: userId,
    });

    return res
      .status(201)
      .json(ApiResponse.success('Create question successfully', question));
  } catch (err) {
    console.error('Error in createQuestion:', err);
    return res
      .status(500)
      .json(
        ApiResponse.error(
          'Internal server error, failure raised at Question.controller',
          err.message
        )
      );
  }
}

async function editQuestion(req, res) {
  const { questionId } = req.params;
  const { title, content, tags } = req.body;

  try {
    const updatedQuestion = await questionService.updateQuestion(questionId, {
      title,
      content,
      tags,
    });
    return res.json(ApiResponse.success('Question updated', updatedQuestion));
  } catch (error) {
    console.error('Error editing question:', error);
    return res
      .status(400)
      .json(ApiResponse.error(error.message || 'Failed to update question'));
  }
}

async function getUserQuestions(req, res) {
  try {
    const { userId } = req.params;
    const userQuestions = await questionService.getUserQuestions(userId);

    if (!userQuestions) {
      return res
        .status(400)
        .json(
          ApiResponse.error(
            'User questions not found, failure raised at Question.controller'
          )
        );
    }

    return res.json(
      ApiResponse.success('Get user questions successfully', userQuestions)
    );
  } catch (err) {
    return res
      .status(500)
      .json(
        ApiResponse.error(
          'Internal server error, failure raised at Question.controller',
          err.message
        )
      );
  }
}

async function upvoteQuestion(req, res) {
  try {
    const { questionId } = req.params;
    const userId = req.userId;

    const result = await questionService.upvoteQuestion(questionId, userId);

    return res.json(ApiResponse.success('Upvote successful', result));
  } catch (err) {
    console.error(err);
    return res.status(400).json(ApiResponse.error(err.message));
  }
}

async function downvoteQuestion(req, res) {
  try {
    const { questionId } = req.params;
    const userId = req.userId;

    const result = await questionService.downvoteQuestion(questionId, userId);

    return res.json(ApiResponse.success('Downvote successful', result));
  } catch (err) {
    console.error(err);
    return res.status(400).json(ApiResponse.error(err.message));
  }
}

async function voteStatus(req, res) {
  try {
    const { questionId } = req.params;
    const userId = req.userId;
    const result = await questionService.voteStatus(questionId, userId);
    return res.json(ApiResponse.success('Vote status fetched', result));
  } catch (err) {
    console.error(err);
    return res.status(400).json(ApiResponse.error(err.message));
  }
}

async function increaseView(req, res) {
  try {
    const { id } = req.params;
    const result = await questionService.increaseViewCount(id);

    return res.json(
      ApiResponse.success('View count increased successfully', result)
    );
  } catch (err) {
    if (err.message === 'Question not found') {
      return res.status(404).json(ApiResponse.error('Question not found'));
    }
    return res
      .status(500)
      .json(ApiResponse.error('Failed to increase view', err.message));
  }
}

async function getUserVotedQuestions(req, res) {
  try {
    const userId = req.params.userId;
    const result = await questionService.getUserVotedQuestions(userId);
    return res.json(ApiResponse.success('User voted questions', result));
  } catch (err) {
    console.error(err);
    return res.status(400).json(ApiResponse.error(err.message));
  }
}
async function deletedQuestion(req, res) {
  try {
    const { questionId } = req.params;
    const userId = req.userId;

    const isOwner = await questionService.isQuestionOwner(questionId, userId);
    if (!isOwner) {
      return res
        .status(403)
        .json(
          ApiResponse.error('You are not authorized to delete this question')
        );
    }

    await questionService.deleteQuestion(questionId, userId);
    return res.json(ApiResponse.success('Question deleted successfully'));
  } catch (err) {
    console.error(err);
    return res.status(400).json(ApiResponse.error(err.message));
  }
}

module.exports = {
  getQuestions,
  getQuestionDetail,
  createQuestion,
  editQuestion,
  getUserQuestions,
  upvoteQuestion,
  downvoteQuestion,
  voteStatus,
  increaseView,
  getUserVotedQuestions,
  deletedQuestion,
};
