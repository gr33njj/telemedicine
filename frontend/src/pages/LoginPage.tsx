import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { renderIcon } from '../components/Icons';
import '../App.css';
import './AuthPages.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
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

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left Side - Branding */}
        <div className="auth-brand">
          <div className="brand-content">
            <div className="brand-logo">
              <svg viewBox="0 0 40 40" fill="none" stroke="white" strokeWidth="2">
                <path d="M8 20a12 12 0 1024 0A12 12 0 008 20z" />
                <path d="M20 14v6m-3-3h6" />
              </svg>
            </div>
            <h1>DocLink</h1>
            <p>Телемедицина нового поколения</p>
            
            <div className="brand-features">
              <div className="feature">
                <div className="feature-icon">{renderIcon('check-circle', 24)}</div>
                <span>Квалифицированные врачи</span>
              </div>
              <div className="feature">
                <div className="feature-icon">{renderIcon('check-circle', 24)}</div>
                <span>Безопасная консультация</span>
              </div>
              <div className="feature">
                <div className="feature-icon">{renderIcon('check-circle', 24)}</div>
                <span>Доступно 24/7</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="auth-form-container">
          <div className="auth-form-card">
            <div className="auth-form-header">
              <h2>Вход в аккаунт</h2>
              <p>Добро пожаловать! Введите ваши учетные данные</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
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
                <label htmlFor="password">Пароль</label>
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
                {loading ? 'Загрузка...' : 'Войти'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                Нет аккаунта?{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate('/register')}
                >
                  Зарегистрироваться
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
