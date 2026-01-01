const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/chat/stream', chatController.streamChat);
router.post('/voice/session', chatController.createVoiceSession);

module.exports = router;
