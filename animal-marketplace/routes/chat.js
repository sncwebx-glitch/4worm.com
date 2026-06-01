const express = require('express');
const Chat = require('../models/Chat');
const { isAuthenticated } = require('../middleware/auth');
const router = express.Router();

// Get or Create Chat
router.post('/get-or-create', isAuthenticated, async (req, res) => {
  try {
    const { otherUserId, listingId } = req.body;
    
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, otherUserId] }
    }).populate('participants', 'firstName lastName avatar').populate('listing', 'title');
    
    if (!chat) {
      chat = new Chat({
        participants: [req.user._id, otherUserId],
        listing: listingId,
        messages: []
      });
      await chat.save();
      await chat.populate('participants', 'firstName lastName avatar').populate('listing', 'title');
    }
    
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Chats
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    }).populate('participants', 'firstName lastName avatar').populate('listing', 'title').sort({ updatedAt: -1 });
    
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Chat Messages
router.get('/:chatId', isAuthenticated, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate('participants', 'firstName lastName avatar').populate('messages.sender', 'firstName lastName avatar');
    
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.participants.map(p => p._id.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Mark messages as read
    chat.messages.forEach(msg => {
      if (msg.sender._id.toString() !== req.user._id.toString()) {
        msg.read = true;
      }
    });
    await chat.save();
    
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Message (HTTP - for non-WebSocket clients)
router.post('/:chatId/message', isAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    
    chat.messages.push({
      sender: req.user._id,
      content,
      timestamp: new Date(),
      read: false
    });
    
    chat.lastMessage = {
      content,
      timestamp: new Date(),
      sender: req.user._id
    };
    
    await chat.save();
    await chat.populate('messages.sender', 'firstName lastName avatar');
    
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
