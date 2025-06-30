const API_BASE_URL = 'http://localhost:3001/api';

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Set token in localStorage
const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Remove token from localStorage
const removeToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Set user data in localStorage  
const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// Get user data from localStorage
const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Check if user is authenticated
const isAuthenticated = () => {
  return !!getToken();
};

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

// Auth API calls
export const authAPI = {
  register: async (userData) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
    }
    
    return data;
  },

  login: async (credentials) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
    }
    
    return data;
  },

  logout: () => {
    removeToken();
  },

  getCurrentUser: () => {
    return getUser();
  },

  isAuthenticated,
};

// Tasks API calls
export const tasksAPI = {
  getTasks: async () => {
    return await apiRequest('/tasks');
  },

  createTask: async (title) => {
    return await apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  updateTask: async (taskId, updates) => {
    return await apiRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteTask: async (taskId) => {
    return await apiRequest(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },
};
