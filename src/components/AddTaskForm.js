import React, { useState } from 'react';
import './AddTaskForm.css';

const AddTaskForm = ({ onAddTask }) => {
  const [taskText, setTaskText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (taskText.trim()) {
      onAddTask(taskText.trim());
      setTaskText('');
    }
  };

  return (
    <section id="add-task" className="add-task-section">
        <div className="add-task-container">
            <h2 className="add-task-title">Add New task</h2>
            <form onSubmit={handleSubmit} className="add-task-form">
                <input type="text" value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="Enter a new task here..."
                    className="task-input"/>
                <button type="submit" className="add-button">
                    Add
                </button>
             </form>
        </div>
    </section>
  );
};

export default AddTaskForm;
