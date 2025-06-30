import React from 'react';
import './WelcomeSection.css';

const WelcomeSection = () => {
  return (
    <section id="welcome" className="welcome-section">
        <div className="welcome-content">
            <div className="welcome-text">
                <h2 className="welcome-title">Welcome!</h2>
                <h1 className="main-title">My To-Do!!</h1>
                <div className="welcome-description">
                    <p>✓ Siap jadi Lebih Produktif? Ayo lah!</p>
                    <p>Atur tugasmu, capai target harimu, dan</p>
                    <p>rasakan kemajuan nyata setiap harinya!</p>
                </div>
            </div>
            <div className="welcome-illustration">
                <div className="clipboard">
                    <div className="clipboard-header"></div>
                        <div className="clipboard-content">
                            <div className="task-item completed">
                                <span className="checkbox">✓</span>
                                <span className="task-text">Task 1</span>
                            </div>
                            <div className="task-item completed">
                                <span span className="checkbox">✓</span>
                                <span className="task-text">Task 2</span>
                            </div>
                            <div className="task-item completed">
                                <span className="checkbox">✓</span>
                                <span className="task-text">Task 3</span>
                            </div>
                            <div className="task-item completed">
                                <span className="checkbox">✓</span>
                                <span className="task-text">Task 4</span>
                            </div>
                        </div>
                    <div className="pencil"></div>
                </div>
            </div>
        </div>
    </section>
  );
};

export default WelcomeSection;
