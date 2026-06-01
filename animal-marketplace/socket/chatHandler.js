const Chat = require('../models/Chat');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);
    
    // Join chat room
    socket.on('join-chat', (chatId) => {
      socket.join(`chat-${chatId}`);
      console.log(`User joined chat: ${chatId}`);
    });
    
    // Leave chat room
    socket.on('leave-chat', (chatId) => {
      socket.leave(`chat-${chatId}`);
      console.log(`User left chat: ${chatId}`);
    });
    
    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { chatId, userId, content } = data;
        
        const chat = await Chat.findById(chatId);
        if (!chat) return;
        
        chat.messages.push({
          sender: userId,
          content,
          timestamp: new Date(),
          read: false
        });
        
        chat.lastMessage = {
          content,
          timestamp: new Date(),
          sender: userId
        };
        
        await chat.save();
        
        // Broadcast to all in chat room
        io.to(`chat-${chatId}`).emit('message-received', {
          sender: userId,
          content,
          timestamp: new Date()
        });
      } catch (err) {
        console.error('Error sending message:', err);
      }
    });
    
    // Typing indicator
    socket.on('user-typing', (data) => {
      const { chatId, userId } = data;
      io.to(`chat-${chatId}`).emit('typing', { userId });
    });
    
    socket.on('user-stopped-typing', (data) => {
      const { chatId, userId } = data;
      io.to(`chat-${chatId}`).emit('stopped-typing', { userId });
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
