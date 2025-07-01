const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory database alternative for testing
let users = [];
let tasks = [];
let nextUserId = 1;
let nextTaskId = 1;

// Database configuration for MySQL (fallback to in-memory if not available)
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
let useInMemory = false;

// Initialize database connection
const initDb = async () => {
  // Check if MySQL environment variables are set
  const hasMySQL = (process.env.MYSQLHOST || process.env.MYSQL_HOST) && 
                   (process.env.MYSQLUSER || process.env.MYSQL_USER) && 
                   (process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE);

  if (!hasMySQL) {
    console.log('MySQL not configured, using in-memory database for testing');
    useInMemory = true;
    return;
  }

  if (!pool && !useInMemory) {
    try {
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
        
        console.log('MySQL database connected successfully');
      } finally {
        connection.release();
      }
    } catch (error) {
      console.log('MySQL connection failed, falling back to in-memory database:', error.message);
      useInMemory = true;
      pool = null;
    }
  }
};

// In-memory database functions
const findUserByEmail = (email) => users.find(u => u.email === email);
const findUserByUsername = (username) => users.find(u => u.username === username);
const createUser = (username, email, hashedPassword) => {
  const user = {
    id: nextUserId++,
    username,
    email,
    password: hashedPassword,
    created_at: new Date()
  };
  users.push(user);
  return user;
};

const getTasksByUserId = (userId) => tasks.filter(t => t.user_id === userId).sort((a, b) => b.id - a.id);
const createTask = (userId, title) => {
  const task = {
    id: nextTaskId++,
    user_id: userId,
    title,
    completed: false,
    created_at: new Date()
  };
  tasks.push(task);
  return task;
};

const findTaskById = (id, userId) => tasks.find(t => t.id === parseInt(id) && t.user_id === userId);
const updateTask = (id, userId, updates) => {
  const taskIndex = tasks.findIndex(t => t.id === parseInt(id) && t.user_id === userId);
  if (taskIndex !== -1) {
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    return tasks[taskIndex];
  }
  return null;
};

const deleteTask = (id, userId) => {
  const taskIndex = tasks.findIndex(t => t.id === parseInt(id) && t.user_id === userId);
  if (taskIndex !== -1) {
    tasks.splice(taskIndex, 1);
    return true;
  }
  return false;
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
    await initDb();
    
    const originalPath = event.path;
    const path = event.path.replace('/.netlify/functions/api', '');
    const method = event.httpMethod;
    
    // Debug logging
    console.log('Request details:', {
      originalPath,
      cleanPath: path,
      method,
      headers: event.headers
    });
    
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
        
        if (useInMemory) {
          // Check if user exists
          if (findUserByEmail(email) || findUserByUsername(username)) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ message: 'User already exists' })
            };
          }
          
          // Create user in memory
          const user = createUser(username, email, hashedPassword);
          
          // Generate JWT token
          const token = jwt.sign(
            { userId: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
          );

          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
              message: 'User registered successfully (in-memory)',
              token,
              user: { id: user.id, username: user.username, email: user.email }
            })
          };
        } else {
          // Insert user to MySQL
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
        }
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
          body: JSON.stringify({ 
            message: 'Registration failed',
            error: error.message,
            using: useInMemory ? 'in-memory' : 'mysql'
          })
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

        let user;
        
        if (useInMemory) {
          user = findUserByEmail(email);
          if (!user) {
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({ message: 'Invalid credentials' })
            };
          }
        } else {
          // Find user in MySQL
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
          
          user = rows[0];
        }
        
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
        
        let userTasks;
        
        if (useInMemory) {
          userTasks = getTasksByUserId(decoded.userId);
        } else {
          const [rows] = await pool.execute(
            'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
            [decoded.userId]
          );
          userTasks = rows;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(userTasks)
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

        let newTask;
        
        if (useInMemory) {
          newTask = createTask(decoded.userId, title);
        } else {
          const [result] = await pool.execute(
            'INSERT INTO tasks (user_id, title) VALUES (?, ?)',
            [decoded.userId, title]
          );

          const [rows] = await pool.execute(
            'SELECT * FROM tasks WHERE id = ?',
            [result.insertId]
          );
          newTask = rows[0];
        }

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newTask)
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

        let updatedTask;
        
        if (useInMemory) {
          const task = findTaskById(taskId, decoded.userId);
          if (!task) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ message: 'Task not found' })
            };
          }
          
          updatedTask = updateTask(taskId, decoded.userId, {
            title: title || task.title,
            completed: completed !== undefined ? completed : task.completed
          });
        } else {
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
          updatedTask = rows[0];
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedTask)
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

        let deleted;
        
        if (useInMemory) {
          deleted = deleteTask(taskId, decoded.userId);
        } else {
          // Verify task belongs to user and delete
          const [result] = await pool.execute(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?',
            [taskId, decoded.userId]
          );
          deleted = result.affectedRows > 0;
        }

        if (!deleted) {
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
      body: JSON.stringify({ 
        message: 'Route not found',
        debug: {
          originalPath: event.path,
          cleanPath: path,
          method: method,
          availableRoutes: [
            'POST /register',
            'POST /auth/register', 
            'POST /login',
            'POST /auth/login',
            'GET /tasks',
            'POST /tasks',
            'PUT /tasks/:id',
            'DELETE /tasks/:id'
          ]
        }
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error.message 
      })
    };
  }
};
