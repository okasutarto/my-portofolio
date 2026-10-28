const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/chat/stream', chatController.streamChat);

module.exports = router;
