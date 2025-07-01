const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple in-memory database
let users = [];
let tasks = [];
let nextUserId = 1;
let nextTaskId = 1;

// Helper functions
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

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path || '';
    const method = event.httpMethod;
    
    console.log('API Request:', { path, method });

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

    // Simple routing based on path ending
    if ((path.includes('/register') || path.endsWith('register')) && method === 'POST') {
      const { username, email, password } = body;

      if (!username || !email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'All fields are required' })
        };
      }

      // Check if user exists
      if (findUserByEmail(email) || findUserByUsername(username)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'User already exists' })
        };
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = createUser(username, email, hashedPassword);

      // Generate token
      const token = jwt.sign(
        { userId: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || 'default-secret-key',
        { expiresIn: '24h' }
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'User registered successfully!',
          token,
          user: { id: user.id, username: user.username, email: user.email }
        })
      };
    }

    // LOGIN
    if ((path.includes('/login') || path.endsWith('login')) && method === 'POST') {
      const { email, password } = body;

      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Email and password are required' })
        };
      }

      const user = findUserByEmail(email);
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            message: 'Invalid credentials. Please register first.' 
          })
        };
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            message: 'Invalid credentials.' 
          })
        };
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || 'default-secret-key',
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
    }

    // GET TASKS
    if (path.includes('/tasks') && method === 'GET' && !path.match(/\/tasks\/\d+/)) {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      
      if (!authHeader) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'No token provided' })
        };
      }

      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');

        const userTasks = tasks.filter(t => t.user_id === decoded.userId).sort((a, b) => b.id - a.id);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(userTasks)
        };
      } catch (error) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid token' })
        };
      }
    }

    // CREATE TASK
    if (path.includes('/tasks') && method === 'POST') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      
      if (!authHeader) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'No token provided' })
        };
      }

      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');

        const { title } = body;
        if (!title) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Title is required' })
          };
        }

        const newTask = createTask(decoded.userId, title);

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ task: newTask })
        };
      } catch (error) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid token' })
        };
      }
    }

    // UPDATE TASK
    if (path.match(/\/tasks\/\d+/) && method === 'PUT') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      
      if (!authHeader) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'No token provided' })
        };
      }

      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');

        const taskIdMatch = path.match(/\/tasks\/(\d+)/);
        const taskId = parseInt(taskIdMatch[1]);
        const { title, completed } = body;

        const taskIndex = tasks.findIndex(t => t.id === taskId && t.user_id === decoded.userId);
        if (taskIndex === -1) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Task not found' })
          };
        }

        if (title !== undefined) tasks[taskIndex].title = title;
        if (completed !== undefined) tasks[taskIndex].completed = completed;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ task: tasks[taskIndex] })
        };
      } catch (error) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid token' })
        };
      }
    }

    // DELETE TASK
    if (path.match(/\/tasks\/\d+/) && method === 'DELETE') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      
      if (!authHeader) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'No token provided' })
        };
      }

      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');

        const taskIdMatch = path.match(/\/tasks\/(\d+)/);
        const taskId = parseInt(taskIdMatch[1]);
        const taskIndex = tasks.findIndex(t => t.id === taskId && t.user_id === decoded.userId);

        if (taskIndex === -1) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Task not found' })
          };
        }

        tasks.splice(taskIndex, 1);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Task deleted successfully' })
        };
      } catch (error) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid token' })
        };
      }
    }

    // Default response
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        message: 'Route not found',
        requestedPath: path,
        method: method
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
