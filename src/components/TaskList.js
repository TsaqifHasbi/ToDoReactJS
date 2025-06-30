import React from 'react';
import './TaskList.css';

const TaskList = ({ tasks, onToggleTask }) => {
  return (
    <section id="task-list" className="task-list-section">
      <div className="task-list-container">
        <h2 className="task-list-title">My Task</h2>
        <div className="task-list">
          {tasks.length === 0 ? (
            <p className="no-tasks">No tasks yet. Add your first task!</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="task-item">
                <label className="task-label">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleTask(task.id)}
                    className="task-checkbox"
                  />
                  <span className="checkmark"></span>
                  <span className={`task-text ${task.completed ? 'completed' : ''}`}>
                    {task.text}
                  </span>
                </label>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default TaskList;
