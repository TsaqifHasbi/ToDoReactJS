import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">Aspirasi Unsoed</h3>
          <p className="footer-text">
            Portal untuk menyampaikan aspirasi, saran, dan masukan dari seluruh civitas akademika Universitas Jenderal Soedirman. Mari bersama membangun kampus yang lebih baik.
          </p>
          <p className="footer-text">
            Universitas Jenderal Soedirman
          </p>
          <p className="footer-contact">Jl. Dr. Soeparno, Karangwangkal, Purwokerto Utara, Kabupaten Banyumas, Jawa Tengah 53122</p>
          <p className="footer-contact">
            Email: <a href="mailto:aspirasi@unsoed.ac.id">aspirasi@unsoed.ac.id</a>
          </p>
          <p className="footer-contact">
            Telp: (0281) 642-951
          </p>
          <p className="footer-text">
            Copyright 2023 Universitas Jenderal Soedirman
          </p>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-title">Aspirasi Unsoed</h3>
          <ul className="footer-links">
            <li><a href="#beranda">Beranda</a></li>
            <li><a href="#masuk">Masuk</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-title">Kontak Kami</h3>
          <p className="footer-contact">
            admin@aspirasiunsoed.com
          </p>
          <p className="footer-contact">
            Jl. Prof. Harsojo no.17, Grendeng, Purwokerto Utara, Banyumas 53122
          </p>
          <div className="social-links">
            <span>📞</span>
            <span>📧</span>
            <span>📍</span>
          </div>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-title">Ikuti Kami</h3>
          <p className="footer-contact">
            Ikuti akun kami di sosial media untuk mendapatkan update terbaru
          </p>
          <div className="social-links">
            <span>📘</span>
            <span>📷</span>
            <span>🐦</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
