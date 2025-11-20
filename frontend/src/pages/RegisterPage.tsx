import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { usePreferences } from '../services/PreferencesContext';
import { renderIcon } from '../components/Icons';
import '../App.css';
import './AuthPages.css';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { theme, language, toggleTheme, toggleLanguage } = usePreferences();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await register(email, password, role, {
        fullName,
        dateOfBirth: birthDate,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка регистрации. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const t = {
    title: language === 'ru' ? 'Создать аккаунт' : 'Create Account',
    subtitle: language === 'ru' ? 'Присоединяйтесь к DocLink и начните консультации' : 'Join DocLink and start consultations',
    fullName: language === 'ru' ? 'ФИО' : 'Full Name',
    birthDate: language === 'ru' ? 'Дата рождения' : 'Date of Birth',
    email: language === 'ru' ? 'Email' : 'Email',
    password: language === 'ru' ? 'Пароль' : 'Password',
    role: language === 'ru' ? 'Я регистрируюсь как' : 'I am registering as',
    rolePatient: language === 'ru' ? 'Пациент - ищу консультацию врача' : 'Patient - seeking medical consultation',
    roleDoctor: language === 'ru' ? 'Врач - хочу консультировать пациентов' : 'Doctor - want to consult patients',
    submit: language === 'ru' ? 'Зарегистрироваться' : 'Sign Up',
    loading: language === 'ru' ? 'Регистрация...' : 'Signing up...',
    successMsg: language === 'ru' ? 'Регистрация успешна! Перенаправление...' : 'Registration successful! Redirecting...',
    hasAccount: language === 'ru' ? 'Уже есть аккаунт?' : 'Already have an account?',
    login: language === 'ru' ? 'Войти' : 'Sign In',
    brandTitle: 'DocLink',
    brandSubtitle: language === 'ru' ? 'Онлайн-консультации с врачами' : 'Online Medical Consultations',
    features: [
      language === 'ru' ? 'Быстрая регистрация' : 'Quick Registration',
      language === 'ru' ? 'Защита данных' : 'Data Protection',
      language === 'ru' ? 'Начните прямо сейчас' : 'Start Right Now'
    ]
  };

  return (
    <div className="auth-page" data-theme={theme}>
      {/* Background Blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      <div className="auth-container">
        {/* Theme & Language Toggle */}
        <div className="auth-preferences">
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

        {/* Left Side - Branding */}
        <div className="auth-brand">
          <div className="brand-content">
            <div className="brand-logo">
              <svg viewBox="0 0 40 40" fill="none" stroke="white" strokeWidth="2">
                <path d="M8 20a12 12 0 1024 0A12 12 0 008 20z" />
                <path d="M20 14v6m-3-3h6" />
              </svg>
            </div>
            <h1>{t.brandTitle}</h1>
            <p>{t.brandSubtitle}</p>
            
            <div className="brand-features">
              {t.features.map((feature, index) => (
                <div key={index} className="feature">
                  <div className="feature-icon">{renderIcon('check-circle', 24)}</div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="auth-form-container">
          <div className="auth-form-card">
            <div className="auth-form-header">
              <h2>{t.title}</h2>
              <p>{t.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="fullName">{t.fullName}</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="birthDate">{t.birthDate}</label>
                <input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">{t.email}</label>
                <input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">{t.password}</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">{t.role}</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="form-select"
                >
                  <option value="patient">{t.rolePatient}</option>
                  <option value="doctor">{t.roleDoctor}</option>
                </select>
              </div>

              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {success && (
                <div className="success-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.successMsg}
                </div>
              )}

              <button
                type="submit"
                className="btn-submit"
                disabled={loading || success}
              >
                {loading ? t.loading : t.submit}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                {t.hasAccount}{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate('/login')}
                >
                  {t.login}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
