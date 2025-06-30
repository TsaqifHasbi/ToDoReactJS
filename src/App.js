import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import WelcomeSection from './components/WelcomeSection';
import AddTaskForm from './components/AddTaskForm';
import TaskList from './components/TaskList';
import ResultSection from './components/ResultSection';
import Footer from './components/Footer';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('My To-Do');
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Learn React And Tailwind', completed: false },
    { id: 2, text: 'Tactical Test', completed: true },
    { id: 3, text: 'Deploy ke Netlify', completed: false }
  ]);

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

  const addTask = (taskText) => {
    const newTask = {
      id: Date.now(),
      text: taskText,
      completed: false
    };
    setTasks([...tasks, newTask]);
  };

  const toggleTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  return (
    <div className="App">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main>
        <WelcomeSection />
        <AddTaskForm onAddTask={addTask} />
        <TaskList tasks={tasks} onToggleTask={toggleTask} />
        <ResultSection tasks={tasks} />
      </main>
      <Footer />
    </div>
  );
}

export default App;
