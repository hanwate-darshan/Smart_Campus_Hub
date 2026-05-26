require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const { mongoSanitizeExpress5 } = require('./src/middleware/security.middleware');

const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const { initSocket } = require('./src/config/socket');
const logger = require('./src/config/logger');
const { globalLimiter, authLimiter } = require('./src/config/rateLimiter');

const authRoutes = require('./src/modules/auth/auth.routes');

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS: Restrict to frontend origin
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// ── 1. Security & Global Middleware ──
app.use(helmet()); // Secure HTTP headers
app.use(mongoSanitizeExpress5); // Custom NoSQL Sanitization (Express 5 compatible)
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(compression()); // Gzip responses
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } })); // HTTP Logger

// ── 2. Request Throttling ──
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// ── 3. Health & Monitoring ──
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// ── 4. Initialization & Routes ──
const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();
        await initSocket(server);
        
        // Auto-seed users in development
        if (process.env.NODE_ENV !== 'production') {
            const seedUsers = require('./src/scripts/seedUsers');
            await seedUsers();
        }
        
        const { initArchiveJob } = require('./src/jobs/lostitem.archive');
        initArchiveJob();

        // ── 5. Monitoring & Routes ──
        const { authenticate } = require('./src/middleware/auth.middleware');
        const { requireRole } = require('./src/middleware/role.middleware');
        const bullBoardAdapter = require('./src/config/bullBoard');

        app.use('/admin/queues', authenticate, requireRole('admin'), bullBoardAdapter.getRouter());

        // Register Routes
        app.use('/api/auth', authRoutes);
        app.use('/api/admin', require('./src/modules/admin/admin.routes'));
        app.use('/api/students', require('./src/modules/student/student.routes'));
        app.use('/api/sos', require('./src/modules/sos/sos.routes'));
        app.use('/api/security', require('./src/modules/security/security.routes'));
        app.use('/api/complaints', require('./src/modules/complaint/complaint.routes'));
        app.use('/api/lost-found', require('./src/modules/lost-found/lostFound.routes'));
        app.use('/api/listings', require('./src/modules/listing/listing.routes'));
        app.use('/api/chat', require('./src/modules/chat/chat.routes'));
        app.use('/api/roommate', require('./src/modules/roommate/roommate.routes'));
        app.use('/api/notifications', require('./src/modules/notification/notification.routes'));

        // Error Handler
        app.use((err, req, res, next) => {
            logger.error(err.stack);
            res.status(err.status || 500).json({
                success: false,
                error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
            });
        });

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        });

        // ── 6. Global Rejection Handlers ──
        process.on('unhandledRejection', (err) => {
            logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
            logger.error(err);
            server.close(() => {
                process.exit(1);
            });
        });

        process.on('uncaughtException', (err) => {
            logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
            logger.error(err);
            process.exit(1);
        });

    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
