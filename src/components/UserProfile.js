import React from 'react';
import './UserProfile.css';

const UserProfile = ({ user, onLogout }) => {
  return (
    <div className="user-profile">
      <div className="profile-info">
        <div className="avatar">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="user-details">
          <h3 className="username">Hello, {user.username}!</h3>
          <p className="user-email">{user.email}</p>
        </div>
      </div>
      <button className="logout-button" onClick={onLogout}>
        Logout
      </button>
    </div>
  );
};

export default UserProfile;
