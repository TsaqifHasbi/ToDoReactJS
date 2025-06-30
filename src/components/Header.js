import React from 'react';
import './Header.css';

const Header = ({ activeTab, onTabChange }) => {
  const tabs = [
    { name: 'My To-Do', section: 'welcome' },
    { name: 'Add Task', section: 'add-task' },
    { name: 'My Task', section: 'task-list' },
    { name: 'Result', section: 'result' }
  ];

  const scrollToSection = (sectionId, tabName) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onTabChange(tabName);
    }
  };

  return (
    <header className="header">
      <nav className="nav">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            className={`nav-button ${activeTab === tab.name ? 'active' : ''}`}
            onClick={() => scrollToSection(tab.section, tab.name)}
          >
            {tab.name}
          </button>
        ))}
      </nav>
    </header>
  );
};

export default Header;
