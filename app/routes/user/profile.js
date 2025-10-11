const express = require('express');
const router = express.Router();
const {
  getUserProfileById,
} = require('../../controller/user/UserProfile.controller');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Profile route is working', timestamp: new Date() });
});

// Get user profile by ID
router.get('/:userId', getUserProfileById);

module.exports = router;
