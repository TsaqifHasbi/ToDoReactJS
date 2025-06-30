import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">TaskFlow</h3>
          <p className="footer-text">
            Aplikasi manajemen tugas yang membantu Anda mengorganisir dan menyelesaikan pekerjaan dengan lebih efisien. Kelola tugas harian Anda dengan mudah dan tingkatkan produktivitas.
          </p>
          <p className="footer-text">
            "Produktivitas adalah tentang menyelesaikan hal yang benar, bukan melakukan banyak hal."
          </p>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-title">Fitur Utama</h3>
          <ul className="footer-links">
            <li><a href="#tasks">📝 Manajemen Tugas</a></li>
            <li><a href="#categories">📂 Kategorisasi</a></li>
            <li><a href="#progress">📊 Tracking Progress</a></li>
            <li><a href="#reminders">⏰ Pengingat</a></li>
            <li><a href="#collaboration">👥 Kolaborasi</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-title">Bantuan & Dukungan</h3>
          <ul className="footer-links">
            <li><a href="#help">❓ Panduan Penggunaan</a></li>
            <li><a href="#faq">💬 FAQ</a></li>
            <li><a href="#contact">📧 Hubungi Kami</a></li>
            <li><a href="#feedback">💡 Kirim Feedback</a></li>
          </ul>
          <p className="footer-contact">
            Email: <a href="mailto:support@taskflow.com">support@taskflow.com</a>
          </p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>&copy; 2025 TaskFlow. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#privacy">Kebijakan Privasi</a>
            <a href="#terms">Syarat & Ketentuan</a>
            <a href="#cookies">Kebijakan Cookie</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
