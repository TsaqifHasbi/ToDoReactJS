const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
let PORT = parseInt(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Todo API Server is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server with better error handling
const startServer = () => {
  const server = app.listen(PORT, 'localhost', () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📝 API Documentation:`);
    console.log(`   - POST /api/auth/register - Register new user`);
    console.log(`   - POST /api/auth/login - Login user`);
    console.log(`   - GET /api/tasks - Get all tasks`);
    console.log(`   - POST /api/tasks - Create new task`);
    console.log(`   - PUT /api/tasks/:id - Update task`);
    console.log(`   - DELETE /api/tasks/:id - Delete task`);
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
