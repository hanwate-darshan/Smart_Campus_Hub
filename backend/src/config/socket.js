const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const logger = require('./logger');

let io = null;

const initSocket = async (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  // Redis Adapter for Scaling
  const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  const subClient = pubClient.duplicate();

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.io Redis adapter connected');
  } catch (err) {
    logger.error('Socket.io Redis adapter connection failed', err);
  }

  // --- /notifications namespace ---
  const notificationsNs = io.of('/notifications');
  notificationsNs.on('connection', (socket) => {
    console.log(`[Notifications] Client connected: ${socket.id}`);

    // Client joins their personal room: "user:{userId}"
    socket.on('join', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`[Notifications] ${socket.id} joined room user:${userId}`);
    });

    socket.on('join_admin', () => {
      socket.join('admin');
      console.log(`[Notifications] ${socket.id} joined room admin`);
    });

    socket.on('disconnect', () => {
      console.log(`[Notifications] Client disconnected: ${socket.id}`);
    });
  });

  // --- /sos namespace ---
  const { socketAuth } = require('../middleware/socketAuth.middleware');
  const registerSOSHandlers = require('../modules/sos/sos.socket');
  
  const sosNs = io.of('/sos');
  
  // Apply Auth Middleware
  sosNs.use(socketAuth);

  sosNs.on('connection', (socket) => {
    console.log(`[SOS] Authenticated client connected: ${socket.id} (User: ${socket.data.user._id})`);
    
    // Register event handlers
    registerSOSHandlers(sosNs, socket);
  });

  // --- /chat namespace ---
  const registerChatHandlers = require('../modules/chat/chat.socket');
  const chatNs = io.of('/chat');
  
  chatNs.use(socketAuth);

  chatNs.on('connection', (socket) => {
    const userId = socket.data.user._id.toString();
    console.log(`[Chat] Authenticated client connected: ${socket.id} (User: ${userId})`);
    
    // Join personal room for cross-device sync if needed
    socket.join(`user:${userId}`);

    // Register event handlers
    registerChatHandlers(chatNs, socket);
  });

  console.log('Socket.io initialized with /notifications, /sos, /chat namespaces');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket(server) first.');
  }
  return io;
};

module.exports = { initSocket, getIO };
