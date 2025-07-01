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
    // Parse path - handle multiple patterns
    let path = event.path || '';

    // Log the original path for debugging
    console.log('ORIGINAL PATH:', event.path);
    console.log('QUERY PARAMS:', event.queryStringParameters);
    console.log('HTTP METHOD:', event.httpMethod);

    path = path.replace('/.netlify/functions/api-simple', '');
    path = path.replace('/.netlify/functions/api', '');

    // Handle /tasks path specifically
    if (path === '/tasks' || path.endsWith('/tasks')) {
      path = '/tasks';
    } else if (path.startsWith('/tasks/')) {
      // Keep task ID paths as-is
    } else if (path.startsWith('/auth/')) {
      path = path.replace('/auth', '');
    }

    const method = event.httpMethod;

    // Debug info
    console.log('DEBUG:', {
      originalPath: event.path,
      cleanPath: path,
      method: method,
      body: event.body
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
          body: JSON.stringify({ message: 'Invalid JSON', error: e.message })
        };
      }
    }

    // REGISTER
    if ((path === '/register' || path === '/auth/register' || path.endsWith('/register')) && method === 'POST') {
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
    if ((path === '/login' || path === '/auth/login' || path.endsWith('/login')) && method === 'POST') {
      const { email, password } = body;

      console.log('Login attempt:', { email, passwordProvided: !!password });
      console.log('Available users:', users.map(u => ({ id: u.id, email: u.email, username: u.username })));

      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Email and password are required' })
        };
      }

      const user = findUserByEmail(email);
      if (!user) {
        console.log('User not found for email:', email);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            message: 'Invalid credentials. Please check your email and password or register first.',
            debug: {
              availableUsers: users.map(u => u.email),
              attemptedEmail: email,
              totalUsers: users.length
            }
          })
        };
      }

      const isValid = await bcrypt.compare(password, user.password);
      console.log('Password validation result:', isValid);
      if (!isValid) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            message: 'Invalid credentials. Please check your email and password.' 
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
    if (path === '/tasks' && method === 'GET') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      console.log('GET /tasks - Authorization header:', authHeader ? 'Present' : 'Missing');

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
        console.log('GET /tasks - Token decoded for user:', decoded.userId);

        const userTasks = tasks.filter(t => t.user_id === decoded.userId).sort((a, b) => b.id - a.id);
        console.log('GET /tasks - Found tasks:', userTasks.length);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(userTasks)
        };
      } catch (error) {
        console.log('GET /tasks - Token verification failed:', error.message);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid token', error: error.message })
        };
      }
    }

    // CREATE TASK
    if (path === '/tasks' && method === 'POST') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      console.log('POST /tasks - Authorization header:', authHeader ? 'Present' : 'Missing');

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
        console.log('POST /tasks - Token decoded for user:', decoded.userId);

        const { title } = body;
        if (!title) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Title is required' })
          };
        }

        const newTask = createTask(decoded.userId, title);
        console.log('POST /tasks - Created task:', newTask);

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ task: newTask })
        };
      } catch (error) {
        console.log('POST /tasks - Token verification failed:', error.message);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid token', error: error.message })
        };
      }
    }

    // UPDATE TASK
    if (path.startsWith('/tasks/') && method === 'PUT') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      console.log('PUT /tasks - Authorization header:', authHeader ? 'Present' : 'Missing');
      
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
        console.log('PUT /tasks - Token decoded for user:', decoded.userId);

        const taskId = parseInt(path.split('/')[2]);
        console.log('PUT /tasks - Task ID:', taskId);
        console.log('PUT /tasks - Request body:', body);
        
        const { title, completed } = body;

        const taskIndex = tasks.findIndex(t => t.id === taskId && t.user_id === decoded.userId);
        console.log('PUT /tasks - Task index found:', taskIndex);
        console.log('PUT /tasks - All tasks:', tasks);
        
        if (taskIndex === -1) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Task not found' })
          };
        }

        console.log('PUT /tasks - Before update:', tasks[taskIndex]);
        if (title !== undefined) tasks[taskIndex].title = title;
        if (completed !== undefined) tasks[taskIndex].completed = completed;
        console.log('PUT /tasks - After update:', tasks[taskIndex]);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ task: tasks[taskIndex] })
        };
      } catch (error) {
        console.log('PUT /tasks - Token verification failed:', error.message);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid token', error: error.message })
        };
      }
    }

    // DELETE TASK
    if (path.startsWith('/tasks/') && method === 'DELETE') {
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

        const taskId = parseInt(path.split('/')[2]);
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

    // DEFAULT RESPONSE WITH DEBUG INFO
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        message: 'Route not found',
        debug: {
          originalPath: event.path,
          cleanPath: path,
          method: method,
          allUsers: users.map(u => ({ id: u.id, username: u.username, email: u.email })),
          allTasks: tasks,
          availableRoutes: [
            'POST /register or /auth/register',
            'POST /login or /auth/login',
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
        error: error.message,
        stack: error.stack
      })
    };
  }
};
