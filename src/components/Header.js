import React from 'react';
import './Header.css';

const Header = ({ activeTab, onTabChange, user, onLogout }) => {
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
      <div className="header-content">
        <div className="logo">
          <h1>TaskFlow</h1>
        </div>
        
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

        {user && (
          <div className="header-profile">
            <div className="profile-avatar">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="profile-name">{user.username}</span>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
