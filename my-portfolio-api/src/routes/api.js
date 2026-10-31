const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { chatRateLimit } = require('../middleware/chatRateLimit');

// POST only: a GET would carry the visitor's message in the URL, where request logs keep it
router.post('/chat/stream', chatRateLimit, chatController.streamChat);

module.exports = router;
