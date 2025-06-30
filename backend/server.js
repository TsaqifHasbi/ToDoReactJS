const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
let PORT = parseInt(process.env.PORT) || 3001;

// CORS configuration untuk production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://your-app-name.netlify.app',  // Ganti dengan URL Netlify Anda nanti
        'https://your-custom-domain.com'      // Jika ada custom domain
      ]
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Todo API Server is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Todo API is working',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Start server with better error handling
const startServer = () => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📝 API Documentation:`);
    console.log(`   - POST /api/auth/register - Register new user`);
    console.log(`   - POST /api/auth/login - Login user`);
    console.log(`   - GET /api/tasks - Get all tasks`);
    console.log(`   - POST /api/tasks - Create new task`);
    console.log(`   - PUT /api/tasks/:id - Update task`);
    console.log(`   - DELETE /api/tasks/:id - Delete task`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      console.log('💡 Trying next available port...');
      PORT = PORT + 1;
      setTimeout(startServer, 1000);
    } else if (err.code === 'EACCES') {
      console.error(`❌ Permission denied for port ${PORT}`);
      console.log('💡 Trying a higher port number...');
      PORT = 8000;
      setTimeout(startServer, 1000);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
};

startServer();
