const express = require('express');
const router = express.Router();
const questionController = require('../../controller/topic/Question.controller');
const authMiddleware = require('../../middleware/App.middleware');
const answerController = require('../../controller/topic/Answer.controller');

// GET /question/:type
router.get('/:type', questionController.getQuestions);
router.get('/detail/:id', questionController.getQuestionDetail);
router.post('/create', authMiddleware, questionController.createQuestion);
router.put(
  '/:questionId/edit',
  authMiddleware,
  questionController.editQuestion
);

/* 
  Temporary remove authMiddleware for testing purpose.
  Expected response is questions created by specific user with userId.
*/
router.get('/user/:userId', questionController.getUserQuestions);
// router.get(
//   '/user/:userId',
//   authMiddleware,
//   questionController.getUserQuestions
// );

// Get answers for a specific question
router.get('/:questionId/answers', answerController.getAnswers);

// Get total answers count for a specific question
router.get('/:questionId/answers/total', answerController.getTotalAnswers);

// Add an answer to a specific question
router.post('/:questionId/answers', authMiddleware, answerController.addAnswer);
// Upvote a question
router.post(
  '/:questionId/upvote',
  authMiddleware,
  questionController.upvoteQuestion
);

// Downvote a question
router.post(
  '/:questionId/downvote',
  authMiddleware,
  questionController.downvoteQuestion
);

// Get vote status for a question
router.get(
  '/:questionId/vote-status',
  authMiddleware,
  questionController.voteStatus
);

// Increase view count for a question
router.post('/:id/view', questionController.increaseView);
module.exports = router;
