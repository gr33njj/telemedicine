import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { usePreferences } from '../services/PreferencesContext';
import { renderIcon } from '../components/Icons';
import '../App.css';
import './AuthPages.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const { theme, language, toggleTheme, toggleLanguage } = usePreferences();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка входа. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  const t = {
    title: language === 'ru' ? 'Вход в аккаунт' : 'Sign In',
    subtitle: language === 'ru' ? 'Добро пожаловать! Введите ваши учетные данные' : 'Welcome back! Enter your credentials',
    email: language === 'ru' ? 'Email' : 'Email',
    password: language === 'ru' ? 'Пароль' : 'Password',
    submit: language === 'ru' ? 'Войти' : 'Sign In',
    loading: language === 'ru' ? 'Загрузка...' : 'Loading...',
    noAccount: language === 'ru' ? 'Нет аккаунта?' : "Don't have an account?",
    register: language === 'ru' ? 'Зарегистрироваться' : 'Sign Up',
    brandTitle: 'DocLink',
    brandSubtitle: language === 'ru' ? 'Онлайн-консультации с врачами' : 'Online Medical Consultations',
    features: [
      language === 'ru' ? 'Квалифицированные врачи' : 'Qualified Doctors',
      language === 'ru' ? 'Безопасная консультация' : 'Secure Consultations',
      language === 'ru' ? 'Доступно 24/7' : 'Available 24/7'
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

              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? t.loading : t.submit}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                {t.noAccount}{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate('/register')}
                >
                  {t.register}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
