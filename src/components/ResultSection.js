import React from 'react';
import './ResultSection.css';

const ResultSection = ({ tasks }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;

  return (
    <section id="result" className="result-section">
      <div className="result-container">
        <h2 className="result-title">Result</h2>
        <div className="result-stats">
          <div className="stat-card">
            <div className="stat-number">{totalTasks}</div>
            <div className="stat-label">Total Task</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{completedTasks}</div>
            <div className="stat-label">Complete</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResultSection;
