const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Database configuration
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.MYSQL_HOST,
  user: process.env.MYSQLUSER || process.env.MYSQL_USER,
  password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT) || 3306,
  ssl: {
    rejectUnauthorized: false
  }
};

let pool;

// Initialize database connection
const initDb = async () => {
  if (!pool) {
    // Validate environment variables
    if (!process.env.MYSQLHOST && !process.env.MYSQL_HOST) {
      throw new Error('Database host not configured');
    }
    if (!process.env.MYSQLUSER && !process.env.MYSQL_USER) {
      throw new Error('Database user not configured');
    }
    if (!process.env.MYSQLDATABASE && !process.env.MYSQL_DATABASE) {
      throw new Error('Database name not configured');
    }
    
    pool = mysql.createPool(dbConfig);
    
    // Test connection and create tables
    const connection = await pool.getConnection();
    
    try {
      // Test connection
      await connection.ping();
      
      // Create users table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create tasks table
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
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Test database connection first
    try {
      await initDb();
    } catch (dbError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Database connection failed', 
          error: dbError.message,
          config: {
            host: process.env.MYSQLHOST ? 'SET' : 'NOT SET',
            user: process.env.MYSQLUSER ? 'SET' : 'NOT SET',
            database: process.env.MYSQLDATABASE ? 'SET' : 'NOT SET',
            port: process.env.MYSQLPORT ? 'SET' : 'NOT SET'
          }
        })
      };
    }
    
    const path = event.path.replace('/.netlify/functions/api', '');
    const method = event.httpMethod;
    
    // Parse request body
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

    // Register endpoint
    if ((path === '/register' || path === '/auth/register') && method === 'POST') {
      try {
        const { username, email, password } = body;
        
        if (!username || !email || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'All fields are required' })
          };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await pool.execute(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hashedPassword]
        );
        
        const userId = result.insertId;
        
        // Generate JWT token
        const token = jwt.sign(
          { userId, username, email },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

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
        if (error.code === 'ER_DUP_ENTRY') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'User already exists' })
          };
        }
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Registration failed' })
        };
      }
    }

    // Login endpoint
    if ((path === '/login' || path === '/auth/login') && method === 'POST') {
      try {
        const { email, password } = body;
        
        if (!email || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Email and password are required' })
          };
        }

        // Find user
        const [rows] = await pool.execute(
          'SELECT * FROM users WHERE email = ?',
          [email]
        );
        
        if (rows.length === 0) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid credentials' })
          };
        }

        const user = rows[0];
        
        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid credentials' })
          };
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, username: user.username, email: user.email },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

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
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Login failed' })
        };
      }
    }

    // Get user's tasks
    if (path === '/tasks' && method === 'GET') {
      try {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'No token provided' })
          };
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const [rows] = await pool.execute(
          'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
          [decoded.userId]
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(rows)
        };
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid token' })
          };
        }
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to fetch tasks' })
        };
      }
    }

    // Create new task
    if (path === '/tasks' && method === 'POST') {
      try {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'No token provided' })
          };
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
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

        const [rows] = await pool.execute(
          'SELECT * FROM tasks WHERE id = ?',
          [result.insertId]
        );

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(rows[0])
        };
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid token' })
          };
        }
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to create task' })
        };
      }
    }

    // Update task
    if (path.startsWith('/tasks/') && method === 'PUT') {
      try {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'No token provided' })
          };
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const taskId = path.split('/')[2];
        const { title, completed } = body;

        // Verify task belongs to user
        const [existing] = await pool.execute(
          'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
          [taskId, decoded.userId]
        );

        if (existing.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Task not found' })
          };
        }

        await pool.execute(
          'UPDATE tasks SET title = ?, completed = ? WHERE id = ? AND user_id = ?',
          [title || existing[0].title, completed !== undefined ? completed : existing[0].completed, taskId, decoded.userId]
        );

        const [rows] = await pool.execute(
          'SELECT * FROM tasks WHERE id = ?',
          [taskId]
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(rows[0])
        };
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid token' })
          };
        }
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to update task' })
        };
      }
    }

    // Delete task
    if (path.startsWith('/tasks/') && method === 'DELETE') {
      try {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'No token provided' })
          };
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const taskId = path.split('/')[2];

        // Verify task belongs to user and delete
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
        if (error.name === 'JsonWebTokenError') {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid token' })
          };
        }
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to delete task' })
        };
      }
    }

    // Route not found
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Route not found' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
