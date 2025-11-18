import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import './LandingPage.css';
import { usePreferences } from '../services/PreferencesContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, language, toggleTheme, toggleLanguage } = usePreferences();

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

  const heroStats = [
    {
      value: '120+',
      label: language === 'ru' ? 'Врачей онлайн' : 'Doctors online',
    },
    {
      value: '4.9',
      label: language === 'ru' ? 'Средний рейтинг' : 'Average rating',
    },
    {
      value: '7 мин',
      label: language === 'ru' ? 'до консультации' : 'to start a call',
    },
  ];

  const specialistCategories = [
    { name: language === 'ru' ? 'Кардиология' : 'Cardiology', count: language === 'ru' ? '12 врачей' : '12 doctors' },
    { name: language === 'ru' ? 'Педиатрия' : 'Pediatrics', count: language === 'ru' ? '18 врачей' : '18 doctors' },
    { name: language === 'ru' ? 'Неврология' : 'Neurology', count: language === 'ru' ? '9 врачей' : '9 doctors' },
    { name: language === 'ru' ? 'Психотерапия' : 'Psychotherapy', count: language === 'ru' ? '6 врачей' : '6 doctors' },
    { name: language === 'ru' ? 'Дерматология' : 'Dermatology', count: language === 'ru' ? '11 врачей' : '11 doctors' },
  ];

  const scheduleMock = [
    {
      day: language === 'ru' ? 'Сегодня' : 'Today',
      dateLabel: language === 'ru' ? '17 ноя' : 'Nov 17',
      slots: ['10:00', '12:30', '15:00', '17:30'],
    },
    {
      day: language === 'ru' ? 'Завтра' : 'Tomorrow',
      dateLabel: language === 'ru' ? '18 ноя' : 'Nov 18',
      slots: ['09:30', '11:00', '13:45', '18:10'],
    },
    {
      day: language === 'ru' ? 'Среда' : 'Wed',
      dateLabel: language === 'ru' ? '19 ноя' : 'Nov 19',
      slots: ['08:00', '10:15', '16:40'],
    },
  ];

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
              <div className="landing-preferences">
                <button className="pref-btn" onClick={toggleLanguage} aria-label="Toggle language">
                  {language === 'ru' ? 'EN' : 'RU'}
                </button>
                <button className="pref-btn" onClick={toggleTheme} aria-label="Toggle theme">
                  {theme === 'light' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              </div>
              <button className="btn-text" onClick={() => navigate('/login')}>
                {t.nav.login}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="hero-kicker">{language === 'ru' ? 'Цифровая клиника' : 'Digital clinic'}</div>
            <h1 className="hero-title">
              <span className="hero-title-line">{language === 'ru' ? t.hero.titleRu : t.hero.titleEn}</span>
            </h1>
            <p className="hero-subtitle">{language === 'ru' ? t.hero.subtitleRu : t.hero.subtitleEn}</p>
            <div className="hero-actions">
              <button className="btn-hero" onClick={() => navigate('/register')}>
                {t.hero.cta}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button className="btn-link" onClick={() => navigate('/doctors')}>
                {language === 'ru' ? 'Смотреть специалистов' : 'Browse doctors'}
              </button>
            </div>
            <div className="hero-metrics">
              {heroStats.map((stat) => (
                <div key={stat.label} className="hero-stat">
                  <span className="hero-stat-value">{stat.value}</span>
                  <span className="hero-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-orbit" />
            <div className="hero-floating-card hero-floating-card--doctors">
              <p className="floating-label">{language === 'ru' ? 'Топ-врачи дня' : 'Top doctors'}</p>
              <div className="floating-doctor">
                <div>
                  <strong>Dr. Соколова</strong>
                  <span>{language === 'ru' ? 'Кардиолог' : 'Cardiologist'}</span>
                </div>
                <div className="floating-rating">4.9 ★</div>
              </div>
              <div className="floating-progress">
                <span>{language === 'ru' ? 'Окна сегодня' : 'Slots today'}</span>
                <div className="progress-track">
                  <div className="progress-thumb" />
                </div>
              </div>
            </div>
            <div className="hero-floating-card hero-floating-card--schedule">
              <p className="floating-label">{language === 'ru' ? 'Ближайшие записи' : 'Upcoming slots'}</p>
              <div className="floating-slots">
                {scheduleMock[0].slots.slice(0, 3).map((slot) => (
                  <span key={slot}>{slot}</span>
                ))}
              </div>
            </div>
            <div className="hero-floating-card hero-floating-card--categories">
              <p className="floating-label">{language === 'ru' ? 'Популярные категории' : 'Popular categories'}</p>
              <div className="floating-tags">
                {specialistCategories.slice(0, 3).map((category) => (
                  <span key={category.name}>{category.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interface Preview */}
      <section className="interface-preview">
        <div className="container preview-grid">
          <div className="preview-copy">
            <p className="preview-kicker">{language === 'ru' ? 'Личный кабинет' : 'Workspace snapshot'}</p>
            <h2>{language === 'ru' ? 'Реальный интерфейс DocLink' : 'The actual DocLink UI'}</h2>
            <p>
              {language === 'ru'
                ? 'Категории врачей, расписание и видеокомната — всё как внутри платформы.'
                : 'Doctor categories, schedule and session room exactly as in DocLink.'}
            </p>
            <ul className="preview-list">
              <li>{language === 'ru' ? 'Категории врачей с рейтингами' : 'Doctor categories with ratings'}</li>
              <li>{language === 'ru' ? 'Живая сетка расписания на 3 дня' : 'Live 3-day schedule grid'}</li>
              <li>{language === 'ru' ? 'Кнопки открытия слотов для врача' : 'Doctor-side slot management'}</li>
            </ul>
          </div>
          <div className="preview-ui">
            <div className="ui-panel specialists-panel">
              <div className="panel-header">
                <span>{language === 'ru' ? 'Специалисты' : 'Specialists'}</span>
                <span className="panel-pill">{language === 'ru' ? 'Категории' : 'Categories'}</span>
              </div>
              <div className="specialists-list">
                {specialistCategories.map((category) => (
                  <div key={category.name} className="specialist-item">
                    <div className="specialist-info">
                      <strong>{category.name}</strong>
                      <span>{category.count}</span>
                    </div>
                    <button type="button">{language === 'ru' ? 'Записаться' : 'Book'}</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="ui-panel schedule-panel">
              <div className="panel-header">
                <span>{language === 'ru' ? 'Расписание' : 'Schedule'}</span>
                <button type="button">{language === 'ru' ? 'Открыть слоты' : 'Open slots'}</button>
              </div>
              <div className="schedule-days">
                {scheduleMock.map((day) => (
                  <div key={day.dateLabel} className="schedule-day">
                    <div className="schedule-day-header">
                      <span className="day-title">{day.day}</span>
                      <span className="day-date">{day.dateLabel}</span>
                    </div>
                    <div className="schedule-slots">
                      {day.slots.map((slot) => (
                        <span key={`${day.dateLabel}-${slot}`}>{slot}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
