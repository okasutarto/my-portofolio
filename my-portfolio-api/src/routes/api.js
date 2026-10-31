const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { chatRateLimit } = require('../middleware/chatRateLimit');

router.get('/chat/stream', chatRateLimit, chatController.streamChat);
router.post('/chat/stream', chatRateLimit, chatController.streamChat);

module.exports = router;
