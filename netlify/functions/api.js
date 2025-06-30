const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Database connection
const getDbClient = () => {
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
};

// Initialize database tables
const initDb = async () => {
  const client = getDbClient();
  await client.connect();
  
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
  } catch (error) {
    console.error('Database init error:', error);
  } finally {
    await client.end();
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path.replace('/.netlify/functions/api', '');
    const body = event.body ? JSON.parse(event.body) : {};
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    // Initialize DB on first request
    if (!context.dbInitialized) {
      await initDb();
      context.dbInitialized = true;
    }
    
    // Register endpoint
    if (event.httpMethod === 'POST' && path === '/auth/register') {
      const { username, email, password } = body;
      
      if (!username || !email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'All fields required' })
        };
      }
      
      const client = getDbClient();
      await client.connect();
      
      try {
        // Check if user exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1 OR username = $2',
          [email, username]
        );
        
        if (existingUser.rows.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'User already exists' })
          };
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await client.query(
          'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
          [username, email, hashedPassword]
        );
        
        const user = result.rows[0];
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '24h' }
        );
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ token, user })
        };
        
      } finally {
        await client.end();
      }
    }
    
    // Login endpoint
    if (event.httpMethod === 'POST' && path === '/auth/login') {
      const { email, password } = body;
      
      const client = getDbClient();
      await client.connect();
      
      try {
        const result = await client.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        
        if (result.rows.length === 0) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid credentials' })
          };
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid credentials' })
          };
        }
        
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '24h' }
        );
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            token,
            user: {
              id: user.id,
              username: user.username,
              email: user.email
            }
          })
        };
        
      } finally {
        await client.end();
      }
    }
    
    // Get tasks endpoint
    if (event.httpMethod === 'GET' && path === '/tasks') {
      if (!authHeader) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'No token provided' })
        };
      }
      
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      
      const client = getDbClient();
      await client.connect();
      
      try {
        const result = await client.query(
          'SELECT id, title, completed, created_at, updated_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
          [decoded.userId]
        );
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows)
        };
        
      } finally {
        await client.end();
      }
    }
    
    // Create task endpoint
    if (event.httpMethod === 'POST' && path === '/tasks') {
      if (!authHeader) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'No token provided' })
        };
      }
      
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      const { title } = body;
      
      const client = getDbClient();
      await client.connect();
      
      try {
        const result = await client.query(
          'INSERT INTO tasks (user_id, title) VALUES ($1, $2) RETURNING *',
          [decoded.userId, title]
        );
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            message: 'Task created successfully',
            task: result.rows[0]
          })
        };
        
      } finally {
        await client.end();
      }
    }
    
    // Update task endpoint
    if (event.httpMethod === 'PUT' && path.startsWith('/tasks/')) {
      if (!authHeader) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'No token provided' })
        };
      }
      
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      const taskId = path.split('/')[2];
      const { completed } = body;
      
      const client = getDbClient();
      await client.connect();
      
      try {
        const result = await client.query(
          'UPDATE tasks SET completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
          [completed, taskId, decoded.userId]
        );
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0])
        };
        
      } finally {
        await client.end();
      }
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Not found' })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Server error',
        error: error.message 
      })
    };
  }
};
