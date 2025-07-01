import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import WelcomeSection from './components/WelcomeSection';
import AddTaskForm from './components/AddTaskForm';
import TaskList from './components/TaskList';
import ResultSection from './components/ResultSection';
import Footer from './components/Footer';
import AuthForm from './components/AuthForm';
import { authAPI, tasksAPI } from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('My To-Do');
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    if (authAPI.isAuthenticated()) {
      const currentUser = authAPI.getCurrentUser();
      setUser(currentUser);
      loadTasks();
    } else {
      setShowAuth(true);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: 'welcome', name: 'My To-Do' },
        { id: 'add-task', name: 'Add Task' },
        { id: 'task-list', name: 'My Task' },
        { id: 'result', name: 'Result' }
      ];

      const scrollPosition = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveTab(sections[i].name);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadTasks = async () => {
    try {
      console.log('Loading tasks...');
      console.log('Token in localStorage:', localStorage.getItem('token'));
      console.log('User in localStorage:', localStorage.getItem('user'));
      console.log('Is authenticated:', authAPI.isAuthenticated());
      
      const tasksData = await tasksAPI.getTasks();
      console.log('Tasks API response:', tasksData);
      
      // Convert API response to frontend format
      const formattedTasks = tasksData.map(task => ({
        id: task.id,
        text: task.title,
        completed: task.completed
      }));
      console.log('Formatted tasks:', formattedTasks);
      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      console.error('Error details:', error.message);
      setError('Failed to load tasks: ' + error.message);
    }
  };

  const handleAuth = async (formData) => {
    setLoading(true);
    setError('');
    
    try {
      let response;
      if (isLogin) {
        response = await authAPI.login({
          email: formData.email,
          password: formData.password
        });
      } else {
        response = await authAPI.register(formData);
      }
      
      setUser(response.user);
      setShowAuth(false);
      await loadTasks();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    setTasks([]);
    setShowAuth(true);
  };

  const addTask = async (taskText) => {
    try {
      const response = await tasksAPI.createTask(taskText);
      const newTask = {
        id: response.task.id,
        text: response.task.title,
        completed: response.task.completed
      };
      setTasks([newTask, ...tasks]);
    } catch (error) {
      console.error('Error adding task:', error);
      setError('Failed to add task');
    }
  };

  const toggleTask = async (taskId) => {
    try {
      console.log('Toggling task:', taskId);
      const task = tasks.find(t => t.id === taskId);
      console.log('Found task:', task);
      
      const response = await tasksAPI.updateTask(taskId, { 
        completed: !task.completed 
      });
      console.log('Update response:', response);
      
      setTasks(tasks.map(task => 
        task.id === taskId ? { 
          ...task, 
          completed: response.task.completed 
        } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      console.error('Error details:', error.message);
      setError('Failed to update task: ' + error.message);
    }
  };

  if (showAuth) {
    return (
      <div className="App">
        <AuthForm
          isLogin={isLogin}
          onToggleMode={() => setIsLogin(!isLogin)}
          onSubmit={handleAuth}
          loading={loading}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="App">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />
      <main>
        <WelcomeSection />
        <AddTaskForm onAddTask={addTask} />
        <TaskList tasks={tasks} onToggleTask={toggleTask} />
        <ResultSection tasks={tasks} />
      </main>
      <Footer />
      {error && (
        <div className="error-notification">
          {error}
          <button onClick={() => setError('')} className="error-close">x</button>
        </div>
      )}
    </div>
  );
}

export default App;
