const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Database configuration untuk Railway MySQL
const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  ssl: {
    rejectUnauthorized: false
  }
};

let pool;

// Initialize database connection
const initDb = async () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    
    // Create tables if they don't exist
    const connection = await pool.getConnection();
    
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      console.log('✅ Database tables created/verified');
    } finally {
      connection.release();
    }
  }
  return pool;
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
    await initDb();
    
    const { httpMethod, path: urlPath } = event;
    const path = urlPath.replace('/.netlify/functions/api', '');
    let body = {};
    
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid JSON' })
        };
      }
    }

    // Helper function to verify JWT token
    const verifyToken = (authHeader) => {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
      }
      const token = authHeader.substring(7);
      return jwt.verify(token, process.env.JWT_SECRET);
    };

    // REGISTER
    if (httpMethod === 'POST' && path === '/auth/register') {
      const { username, email, password } = body;
      
      if (!username || !email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'All fields required' })
        };
      }
      
      try {
        // Check if user exists
        const [existingUsers] = await pool.execute(
          'SELECT id FROM users WHERE email = ? OR username = ?',
          [email, username]
        );
        
        if (existingUsers.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'User already exists' })
          };
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const [result] = await pool.execute(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hashedPassword]
        );
        
        const userId = result.insertId;
        
        // Generate JWT
        const token = jwt.sign({ userId, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            message: 'User registered successfully',
            token,
            user: { id: userId, username, email }
          })
        };
      } catch (error) {
        console.error('Register error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Registration failed' })
        };
      }
    }

    // LOGIN
    if (httpMethod === 'POST' && path === '/auth/login') {
      const { email, password } = body;
      
      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Email and password required' })
        };
      }
      
      try {
        // Find user
        const [users] = await pool.execute(
          'SELECT id, username, email, password FROM users WHERE email = ?',
          [email]
        );
        
        if (users.length === 0) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid credentials' })
          };
        }
        
        const user = users[0];
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid credentials' })
          };
        }
        
        // Generate JWT
        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email }
          })
        };
      } catch (error) {
        console.error('Login error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Login failed' })
        };
      }
    }

    // GET TASKS
    if (httpMethod === 'GET' && path === '/tasks') {
      try {
        const decoded = verifyToken(event.headers.authorization);
        
        const [tasks] = await pool.execute(
          'SELECT id, title, completed, created_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
          [decoded.userId]
        );
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(tasks)
        };
      } catch (error) {
        console.error('Get tasks error:', error);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Unauthorized' })
        };
      }
    }

    // CREATE TASK
    if (httpMethod === 'POST' && path === '/tasks') {
      try {
        const decoded = verifyToken(event.headers.authorization);
        const { title } = body;
        
        if (!title) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Title is required' })
          };
        }
        
        const [result] = await pool.execute(
          'INSERT INTO tasks (user_id, title) VALUES (?, ?)',
          [decoded.userId, title]
        );
        
        const [newTask] = await pool.execute(
          'SELECT id, title, completed, created_at FROM tasks WHERE id = ?',
          [result.insertId]
        );
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newTask[0])
        };
      } catch (error) {
        console.error('Create task error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to create task' })
        };
      }
    }

    // UPDATE TASK
    if (httpMethod === 'PUT' && path.startsWith('/tasks/')) {
      try {
        const decoded = verifyToken(event.headers.authorization);
        const taskId = path.split('/')[2];
        const { title, completed } = body;
        
        // Check if task belongs to user
        const [tasks] = await pool.execute(
          'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
          [taskId, decoded.userId]
        );
        
        if (tasks.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Task not found' })
          };
        }
        
        // Update task
        await pool.execute(
          'UPDATE tasks SET title = COALESCE(?, title), completed = COALESCE(?, completed) WHERE id = ?',
          [title, completed, taskId]
        );
        
        const [updatedTask] = await pool.execute(
          'SELECT id, title, completed, created_at FROM tasks WHERE id = ?',
          [taskId]
        );
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedTask[0])
        };
      } catch (error) {
        console.error('Update task error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to update task' })
        };
      }
    }

    // DELETE TASK
    if (httpMethod === 'DELETE' && path.startsWith('/tasks/')) {
      try {
        const decoded = verifyToken(event.headers.authorization);
        const taskId = path.split('/')[2];
        
        // Check if task belongs to user and delete
        const [result] = await pool.execute(
          'DELETE FROM tasks WHERE id = ? AND user_id = ?',
          [taskId, decoded.userId]
        );
        
        if (result.affectedRows === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Task not found' })
          };
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Task deleted successfully' })
        };
      } catch (error) {
        console.error('Delete task error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to delete task' })
        };
      }
    }

    // Default 404
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
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
