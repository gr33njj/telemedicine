import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ru' ? 'en' : 'ru');
  };

  const t = {
    nav: {
      tech: language === 'ru' ? 'Технологии' : 'Technology',
      services: language === 'ru' ? 'Сервисы' : 'Services',
      contact: language === 'ru' ? 'Контакт' : 'Contact',
      login: language === 'ru' ? 'Войти' : 'Sign in'
    },
    hero: {
      titleRu: 'Телемедицина нового поколения',
      titleEn: 'Next-generation telemedicine',
      subtitleRu: 'Консультации с врачами онлайн. Быстро, удобно и безопасно.',
      subtitleEn: 'Online consultations with doctors. Fast, convenient and secure.',
      cta: language === 'ru' ? 'Начать консультацию' : 'Start consultation'
    },
    features: {
      title: language === 'ru' ? 'Преимущества' : 'Advantages',
      items: [
        {
          title: language === 'ru' ? 'Врачи' : 'Doctors',
          description: language === 'ru' ? 'Проверенные специалисты с сертификатами' : 'Verified specialists with certificates'
        },
        {
          title: language === 'ru' ? 'Скорость' : 'Speed',
          description: language === 'ru' ? 'Консультация в день обращения' : 'Consultation on the day of request'
        },
        {
          title: language === 'ru' ? 'Удобство' : 'Comfort',
          description: language === 'ru' ? 'Видео, аудио, чат и документы' : 'Video, audio, chat and files'
        },
        {
          title: language === 'ru' ? 'Безопасность' : 'Security',
          description: language === 'ru' ? 'Шифрование данных и защита' : 'Encryption and protection'
        },
        {
          title: language === 'ru' ? 'Медкарта' : 'Medical Record',
          description: language === 'ru' ? 'История всех консультаций' : 'History of all consultations'
        },
        {
          title: language === 'ru' ? 'Поинты' : 'Points',
          description: language === 'ru' ? 'Гибкая система платежей' : 'Flexible payment system'
        }
      ]
    },
    howItWorks: {
      title: language === 'ru' ? 'Как это работает' : 'How it works',
      steps: [
        language === 'ru' ? 'Регистрация' : 'Registration',
        language === 'ru' ? 'Пополнение' : 'Top-up',
        language === 'ru' ? 'Выбор врача' : 'Choose doctor',
        language === 'ru' ? 'Консультация' : 'Consultation',
        language === 'ru' ? 'Результаты' : 'Results'
      ]
    },
    footer: {
      description: language === 'ru'
        ? 'DocLink — телемедицинский сервис нового поколения'
        : 'DocLink — next-generation telemedicine service',
      product: language === 'ru' ? 'Продукт' : 'Product',
      company: language === 'ru' ? 'Компания' : 'Company',
      features: language === 'ru' ? 'Возможности' : 'Features',
      pricing: language === 'ru' ? 'Тарифы' : 'Pricing',
      about: language === 'ru' ? 'О нас' : 'About',
      contact: language === 'ru' ? 'Контакты' : 'Contact'
    }
  };

  return (
    <div className="landing-page" data-theme={theme}>
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            <div className="logo">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="logo-text">DocLink</span>
            </div>

            <nav className="nav">
              <a href="#features" className="nav-link">{t.nav.tech}</a>
              <a href="#how-it-works" className="nav-link">{t.nav.services}</a>
              <a href="#contact" className="nav-link">{t.nav.contact}</a>
            </nav>

            <div className="header-actions">
              <button className="lang-toggle" onClick={toggleLanguage}>
                {language === 'ru' ? 'EN' : 'RU'}
              </button>
              <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'light' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0112 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>
              <button className="btn-text" onClick={() => navigate('/login')}>
                {t.nav.login}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="hero-title-line">{language === 'ru' ? t.hero.titleRu : t.hero.titleEn}</span>
            </h1>
            <p className="hero-subtitle">{language === 'ru' ? t.hero.subtitleRu : t.hero.subtitleEn}</p>
            <button className="btn-hero" onClick={() => navigate('/register')}>
              {t.hero.cta}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">{t.features.title}</h2>
          <div className="features-grid">
            {t.features.items.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  {index === 0 && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                  {index === 1 && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {index === 2 && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  )}
                  {index === 3 && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  {index === 4 && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {index === 5 && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title">{t.howItWorks.title}</h2>
          <div className="steps-visual">
            {t.howItWorks.steps.map((step, index) => (
              <div key={index} className="step-visual">
                <div className="step-circle">{index + 1}</div>
                <div className="step-label">{step}</div>
                {index < t.howItWorks.steps.length - 1 && <div className="step-arrow"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interface Preview */}
      <section className="interface-preview">
        <div className="container">
          <div className="preview-wrapper">
            <div className="preview-card">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="preview-content">
                <div className="preview-sidebar">
                  <div className="preview-nav-item"></div>
                  <div className="preview-nav-item"></div>
                  <div className="preview-nav-item active"></div>
                  <div className="preview-nav-item"></div>
                </div>
                <div className="preview-main">
                  <div className="preview-header-block"></div>
                  <div className="preview-cards">
                    <div className="preview-card-item"></div>
                    <div className="preview-card-item"></div>
                    <div className="preview-card-item"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-main">
              <div className="footer-brand">
                <div className="logo">
                  <div className="logo-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="logo-text">DocLink</span>
                </div>
                <p className="footer-description">{t.footer.description}</p>
              </div>

              <div className="footer-links">
                <div className="footer-column">
                  <h4>{t.footer.product}</h4>
                  <ul>
                    <li><a href="#features">{t.footer.features}</a></li>
                    <li><a href="#pricing">{t.footer.pricing}</a></li>
                  </ul>
                </div>
                <div className="footer-column">
                  <h4>{t.footer.company}</h4>
                  <ul>
                    <li><a href="#about">{t.footer.about}</a></li>
                    <li><a href="#contact">{t.footer.contact}</a></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <p>© 2024 DocLink. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
