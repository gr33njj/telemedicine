import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import NotificationCenter from './NotificationCenter';
import { usePreferences } from '../services/PreferencesContext';
import './Navigation.css';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { language, toggleLanguage, theme, toggleTheme } = usePreferences();
  const isEnglish = language === 'en';

  const copy = {
    brand: 'DocLink',
    nav: {
      home: isEnglish ? 'Home' : 'Главная',
      doctors: isEnglish ? 'Doctors' : 'Врачи',
      consultations: isEnglish ? 'Consultations' : 'Консультации',
      wallet: isEnglish ? 'Wallet' : 'Кошелёк',
      profile: isEnglish ? 'Profile' : 'Профиль',
      schedule: isEnglish ? 'Schedule' : 'Расписание',
      admin: isEnglish ? 'Admin' : 'Админ',
    },
    userMenu: {
      profile: isEnglish ? 'My profile' : 'Мой профиль',
      settings: isEnglish ? 'Settings' : 'Настройки',
      logout: isEnglish ? 'Log out' : 'Выйти',
    },
    preferences: {
      theme: isEnglish ? 'Theme' : 'Тема',
      language: isEnglish ? 'Language' : 'Язык',
    },
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'dashboard':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m-9.5-2.5A2.5 2.5 0 0121 4.5A2.5 2.5 0 018.5 9" />
          </svg>
        );
      case 'doctors':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a4 4 0 118 0m-8 0a4 4 0 100 8m0-8a4 4 0 110 8" />
          </svg>
        );
      case 'consultations':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'wallet':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'profile':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'schedule':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'admin':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'logout':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        );
      case 'settings':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const patientLinks = [
    { path: '/dashboard', icon: 'dashboard', label: copy.nav.home },
    { path: '/doctors', icon: 'doctors', label: copy.nav.doctors },
    { path: '/consultations', icon: 'consultations', label: copy.nav.consultations },
    { path: '/wallet', icon: 'wallet', label: copy.nav.wallet },
    { path: '/profile', icon: 'profile', label: copy.nav.profile },
  ];

  const doctorLinks = [
    { path: '/dashboard', icon: 'dashboard', label: copy.nav.home },
    { path: '/schedule', icon: 'schedule', label: copy.nav.schedule },
    { path: '/consultations', icon: 'consultations', label: copy.nav.consultations },
    { path: '/profile', icon: 'profile', label: copy.nav.profile },
  ];

  const links = user?.role === 'doctor' ? doctorLinks : patientLinks;

  return (
    <>
      {/* Desktop Navigation */}
      <header className="main-header">
        <div className="container">
          <nav className="main-nav">
            <div className="nav-brand" onClick={() => navigate('/dashboard')}>
              <span className="brand-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <span className="brand-name">DocLink</span>
            </div>

            <div className="nav-links desktop-only">
              {links.map((link) => (
                <a
                  key={link.path}
                  href={link.path}
                  className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(link.path);
                  }}
                >
                  <span className="link-icon">{renderIcon(link.icon)}</span>
                  <span className="link-label">{link.label}</span>
                </a>
              ))}
              {user?.role === 'admin' && (
                <a
                  href="/admin"
                  className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/admin');
                  }}
                >
                  <span className="link-icon">{renderIcon('admin')}</span>
                  <span className="link-label">{copy.nav.admin}</span>
                </a>
              )}
            </div>

            <div className="nav-user">
              <div className="nav-preferences desktop-only">
                <button
                  className="pref-btn"
                  onClick={toggleLanguage}
                  aria-label={copy.preferences.language}
                >
                  {language === 'ru' ? 'EN' : 'RU'}
                </button>
                <button
                  className="pref-btn"
                  onClick={toggleTheme}
                  aria-label={copy.preferences.theme}
                >
                  {theme === 'light' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <NotificationCenter />
              <div
                className="user-avatar"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user?.email?.charAt(0).toUpperCase()}
              </div>

              {showUserMenu && (
                <>
                  <div
                    className="user-menu-overlay"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="user-menu">
                    <div className="user-menu-header">
                      <div className="user-menu-avatar">
                        {user?.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-menu-info">
                        <div className="user-menu-name">
                          {user?.email?.split('@')[0]}
                        </div>
                        <div className="user-menu-email">{user?.email}</div>
                      </div>
                    </div>
                    <div className="user-preferences mobile-only">
                      <button
                        className="pref-btn"
                        onClick={toggleLanguage}
                        aria-label={copy.preferences.language}
                      >
                        {language === 'ru' ? 'EN' : 'RU'}
                      </button>
                      <button
                        className="pref-btn"
                        onClick={toggleTheme}
                        aria-label={copy.preferences.theme}
                      >
                        {theme === 'light' ? '☀︎' : '☾'}
                      </button>
                    </div>
                    <div className="user-menu-items">
                      <button
                        className="user-menu-item"
                        onClick={() => {
                          navigate('/profile');
                          setShowUserMenu(false);
                        }}
                      >
                        <span>{renderIcon('profile')}</span>
                        {copy.userMenu.profile}
                      </button>
                      <button
                        className="user-menu-item"
                        onClick={() => {
                          navigate('/settings');
                          setShowUserMenu(false);
                        }}
                      >
                        <span>{renderIcon('settings')}</span>
                        {copy.userMenu.settings}
                      </button>
                      <button className="user-menu-item logout" onClick={handleLogout}>
                        <span>{renderIcon('logout')}</span>
                        {copy.userMenu.logout}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="mobile-nav mobile-only">
        {links.map((link) => (
          <a
            key={link.path}
            href={link.path}
            className={`mobile-nav-item ${isActive(link.path) ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(link.path);
            }}
          >
            <span className="mobile-nav-icon">{renderIcon(link.icon)}</span>
            <span className="mobile-nav-label">{link.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
};

export default Navigation;
