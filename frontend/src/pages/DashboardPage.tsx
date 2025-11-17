import React from 'react';
import { useAuth } from '../services/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { usePreferences } from '../services/PreferencesContext';
import '../App.css';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = usePreferences();
  const isEnglish = language === 'en';
  const t = (ru: string, en: string) => (isEnglish ? en : ru);
  const navigate = useNavigate();

  const renderIcon = (type: string) => {
    switch (type) {
      case 'wallet':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'schedule':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'check':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'documents':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'users':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'star':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'video':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'doctors':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a4 4 0 118 0m-8 0a4 4 0 100 8m0-8a4 4 0 110 8" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      <Navigation />

      <main className="dashboard-main">
        <div className="container">
          {/* Welcome Section */}
          <section className="welcome-section">
            <div className="welcome-content">
              <h1>{t('Добро пожаловать', 'Welcome')}, {user?.email?.split('@')[0]}!</h1>
              <p>
                {user?.role === 'patient' &&
                  t('Управляйте своим здоровьем с помощью наших сервисов', 'Manage your health with our services')}
                {user?.role === 'doctor' &&
                  t('Помогайте пациентам получать качественную медицинскую помощь', 'Help patients receive high-quality care')}
                {user?.role === 'admin' && t('Панель управления сервисом', 'Service control panel')}
              </p>
            </div>
          </section>

          {/* Stats Section */}
          <section className="stats-section">
            <h2>{t('Обзор', 'Overview')}</h2>
            <div className="stats-grid">
              {user?.role === 'patient' ? (
                <>
                  <div className="stat-card">
                    <div className="stat-icon">{renderIcon('wallet')}</div>
                    <div className="stat-content">
                      <div className="stat-value">1,250</div>
                      <div className="stat-label">{t('Поинтов на балансе', 'Points on balance')}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">{renderIcon('schedule')}</div>
                    <div className="stat-content">
                      <div className="stat-value">2</div>
                        <div className="stat-label">{t('Предстоящих консультаций', 'Upcoming consultations')}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">{renderIcon('check')}</div>
                    <div className="stat-content">
                      <div className="stat-value">12</div>
                      <div className="stat-label">Завершенных консультаций</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">{renderIcon('documents')}</div>
                    <div className="stat-content">
                      <div className="stat-value">8</div>
                      <div className="stat-label">{t('Документов в медкарте', 'Documents in medical record')}</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="stat-card">
                    <div className="stat-icon">{renderIcon('users')}</div>
                    <div className="stat-content">
                      <div className="stat-value">45</div>
                      <div className="stat-label">{t('Пациентов', 'Patients')}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">{renderIcon('schedule')}</div>
                    <div className="stat-content">
                      <div className="stat-value">5</div>
                      <div className="stat-label">{t('Консультаций сегодня', 'Consultations today')}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">{renderIcon('star')}</div>
                    <div className="stat-content">
                      <div className="stat-value">4.8</div>
                      <div className="stat-label">{t('Рейтинг', 'Rating')}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">{renderIcon('wallet')}</div>
                    <div className="stat-content">
                      <div className="stat-value">12,500</div>
                      <div className="stat-label">{t('Поинтов заработано', 'Points earned')}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Quick Actions Section */}
          <section className="quick-actions-section">
            <h2>{t('Быстрые действия', 'Quick actions')}</h2>
            <div className="quick-actions-grid">
              {user?.role === 'patient' ? (
                <>
                  <button
                    className="quick-action-card"
                    onClick={() => navigate('/doctors')}
                  >
                    <div className="action-icon">{renderIcon('doctors')}</div>
                    <span>{t('Найти врача', 'Find a doctor')}</span>
                  </button>
                  <button
                    className="quick-action-card"
                    onClick={() => navigate('/schedule')}
                  >
                    <div className="action-icon">{renderIcon('schedule')}</div>
                    <span>{t('Записаться', 'Book')}</span>
                  </button>
                  <button
                    className="quick-action-card"
                    onClick={() => navigate('/wallet')}
                  >
                    <div className="action-icon">{renderIcon('wallet')}</div>
                    <span>{t('Пополнить баланс', 'Top up balance')}</span>
                  </button>
                  <button
                    className="quick-action-card"
                    onClick={() => navigate('/profile')}
                  >
                    <div className="action-icon">{renderIcon('documents')}</div>
                    <span>{t('Моя медкарта', 'My medical record')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="quick-action-card"
                    onClick={() => navigate('/schedule')}
                  >
                    <div className="action-icon">{renderIcon('schedule')}</div>
                    <span>{t('Расписание', 'Schedule')}</span>
                  </button>
                  <button
                    className="quick-action-card"
                    onClick={() => navigate('/consultations')}
                  >
                    <div className="action-icon">{renderIcon('video')}</div>
                    <span>{t('Консультации', 'Consultations')}</span>
                  </button>
                  <button
                    className="quick-action-card"
                    onClick={() => navigate('/profile')}
                  >
                    <div className="action-icon">{renderIcon('users')}</div>
                    <span>{t('Мой профиль', 'My profile')}</span>
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Upcoming Appointments */}
          <section className="appointments-section">
            <div className="section-header">
            <h2>{t('Предстоящие консультации', 'Upcoming consultations')}</h2>
              <button
                className="btn btn-primary"
                onClick={() => navigate(user?.role === 'patient' ? '/doctors' : '/schedule')}
              >
                {user?.role === 'patient' ? t('Записаться', 'Book') : t('Настроить расписание', 'Manage schedule')}
              </button>
            </div>

            <div className="appointments-list">
              <div className="appointment-card">
                <div className="appointment-avatar">
                  {user?.role === 'patient' ? 'Д' : 'П'}
                </div>
                <div className="appointment-details">
                  <h3>
                  {user?.role === 'patient' ? t('Доктор Иванов И.И.', 'Dr. Ivanov') : t('Пациент Петров П.П.', 'Patient Petrov')}
                  </h3>
                  <p>
                    {user?.role === 'patient'
                      ? t('Терапевт, 15 лет опыта', 'Therapist, 15 years experience')
                      : t('Онлайн консультация', 'Online consultation')}
                  </p>
                </div>
                <div className="appointment-time">
                  <div className="time-badge">{t('Сегодня', 'Today')}</div>
                  <p>15:00 - 15:30</p>
                </div>
              </div>

              <div className="appointment-card">
                <div className="appointment-avatar">С</div>
                <div className="appointment-details">
                  <h3>
                    {user?.role === 'patient'
                      ? t('Доктор Сидорова А.В.', 'Dr. Sidorova')
                      : t('Пациент Сидоров С.С.', 'Patient Sidorov')}
                  </h3>
                  <p>
                    {user?.role === 'patient'
                      ? t('Кардиолог, 20 лет опыта', 'Cardiologist, 20 years experience')
                      : t('Онлайн консультация', 'Online consultation')}
                  </p>
                </div>
                <div className="appointment-time">
                  <div className="time-badge upcoming">{t('Завтра', 'Tomorrow')}</div>
                  <p>10:00 - 10:30</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
