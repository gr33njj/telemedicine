import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import api from '../services/api';
import { usePreferences } from '../services/PreferencesContext';
import '../App.css';
import './DashboardPage.css';

type ConsultationStatus = 'created' | 'active' | 'completed' | 'cancelled';

interface Consultation {
  id: number;
  status: ConsultationStatus;
  doctor_name?: string;
  doctor_specialty?: string;
  doctor_email?: string;
  patient_name?: string;
  patient_email?: string;
  slot_start_time?: string;
  slot_end_time?: string;
}

interface ApiSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_reserved: boolean;
  is_available: boolean;
}

interface DoctorProfileSummary {
  is_verified: boolean;
  verification_status: string;
  specialty?: string | null;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = usePreferences();
  const isEnglish = language === 'en';
  const t = (ru: string, en: string) => (isEnglish ? en : ru);

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  const [consultationsError, setConsultationsError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [doctorSlots, setDoctorSlots] = useState<ApiSlot[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfileSummary | null>(null);

  useEffect(() => {
    const loadConsultations = async () => {
      try {
        setConsultationsLoading(true);
        const { data } = await api.get<Consultation[]>('/consultations/history', { params: { limit: 50 } });
        setConsultations(data);
        setConsultationsError(null);
      } catch (error) {
        console.error('Failed to load consultations summary', error);
        setConsultationsError(t('Не удалось загрузить консультации', 'Failed to load consultations'));
      } finally {
        setConsultationsLoading(false);
      }
    };
    loadConsultations();
  }, [t]);

  useEffect(() => {
    if (user?.role === 'patient') {
      const loadWallet = async () => {
        try {
          setWalletLoading(true);
          const { data } = await api.get('/wallet/balance');
          setWalletBalance(Number(data.balance ?? 0));
        } catch (error) {
          console.error('Failed to load wallet info', error);
        } finally {
          setWalletLoading(false);
        }
      };
      loadWallet();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'doctor') {
      const loadSlots = async () => {
        try {
          const { data } = await api.get<ApiSlot[]>('/schedule/slots');
          setDoctorSlots(data);
        } catch (error) {
          console.error('Failed to load doctor slots', error);
        }
      };
      const loadProfile = async () => {
        try {
          const { data } = await api.get('/doctors/profile');
          setDoctorProfile({
            is_verified: data.is_verified,
            verification_status: data.verification_status,
            specialty: data.specialty,
          });
        } catch (error) {
          console.error('Failed to load doctor profile summary', error);
        }
      };
      loadSlots();
      loadProfile();
    }
  }, [user]);

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
      case 'calendar':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5m8 2V5m-9 6h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

  const upcomingConsultations = useMemo(
    () => consultations.filter((consultation) => consultation.status === 'created' || consultation.status === 'active'),
    [consultations],
  );

  const completedConsultations = useMemo(
    () => consultations.filter((consultation) => consultation.status === 'completed'),
    [consultations],
  );

  const upcomingPreview = upcomingConsultations.slice(0, 3);
  const todayKey = new Date().toISOString().split('T')[0];
  const slotsToday = doctorSlots.filter((slot) => slot.start_time.startsWith(todayKey));
  const profileStatusLabel = doctorProfile
    ? doctorProfile.is_verified
      ? t('Опубликован', 'Published')
      : doctorProfile.verification_status === 'pending'
        ? t('На модерации', 'Awaiting review')
        : t('Черновик', 'Draft')
    : t('Нет данных', 'No data');

  const patientStats = [
    {
      icon: 'wallet',
      label: t('Баланс', 'Balance'),
      value: walletLoading ? '…' : walletBalance !== null ? `${walletBalance} pts` : '—',
    },
    {
      icon: 'schedule',
      label: t('Предстоящие консультации', 'Upcoming consultations'),
      value: upcomingConsultations.length,
    },
    {
      icon: 'check',
      label: t('Завершённые консультации', 'Completed consultations'),
      value: completedConsultations.length,
    },
    {
      icon: 'documents',
      label: t('Всего консультаций', 'Total consultations'),
      value: consultations.length,
    },
  ];

  const doctorStats = [
    {
      icon: 'schedule',
      label: t('Предстоящие консультации', 'Upcoming consultations'),
      value: upcomingConsultations.length,
    },
    {
      icon: 'calendar',
      label: t('Окна на сегодня', 'Slots today'),
      value: slotsToday.length,
    },
    {
      icon: 'check',
      label: t('Завершённые консультации', 'Completed consultations'),
      value: completedConsultations.length,
    },
    {
      icon: 'star',
      label: t('Статус профиля', 'Profile status'),
      value: profileStatusLabel,
    },
  ];

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
              {(user?.role === 'doctor' ? doctorStats : patientStats).map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <div className="stat-icon">{renderIcon(stat.icon)}</div>
                  <div className="stat-content">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions Section */}
          <section className="quick-actions-section">
            <h2>{t('Быстрые действия', 'Quick actions')}</h2>
            <div className="quick-actions-grid">
              {user?.role === 'doctor' ? (
                <>
                  <button className="quick-action-card" onClick={() => navigate('/schedule')}>
                    <div className="action-icon">{renderIcon('schedule')}</div>
                    <span>{t('Управлять расписанием', 'Manage schedule')}</span>
                  </button>
                  <button className="quick-action-card" onClick={() => navigate('/consultations')}>
                    <div className="action-icon">{renderIcon('video')}</div>
                    <span>{t('Мои консультации', 'My consultations')}</span>
                  </button>
                  <button className="quick-action-card" onClick={() => navigate('/profile')}>
                    <div className="action-icon">{renderIcon('users')}</div>
                    <span>{t('Профиль врача', 'Doctor profile')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button className="quick-action-card" onClick={() => navigate('/doctors')}>
                    <div className="action-icon">{renderIcon('doctors')}</div>
                    <span>{t('Найти врача', 'Find a doctor')}</span>
                  </button>
                  <button className="quick-action-card" onClick={() => navigate('/schedule')}>
                    <div className="action-icon">{renderIcon('schedule')}</div>
                    <span>{t('Записаться', 'Book')}</span>
                  </button>
                  <button className="quick-action-card" onClick={() => navigate('/wallet')}>
                    <div className="action-icon">{renderIcon('wallet')}</div>
                    <span>{t('Пополнить баланс', 'Top up balance')}</span>
                  </button>
                  <button className="quick-action-card" onClick={() => navigate('/profile')}>
                    <div className="action-icon">{renderIcon('documents')}</div>
                    <span>{t('Моя медкарта', 'My medical record')}</span>
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
                onClick={() => navigate(user?.role === 'doctor' ? '/schedule' : '/schedule')}
              >
                {user?.role === 'doctor' ? t('Управлять расписанием', 'Manage schedule') : t('Записаться', 'Book')}
              </button>
            </div>

            {consultationsLoading ? (
              <div className="appointments-list">
                <div className="appointment-card">
                  <p>{t('Загружаем консультации…', 'Loading consultations…')}</p>
                </div>
              </div>
            ) : consultationsError ? (
              <div className="appointments-list">
                <div className="appointment-card">
                  <p>{consultationsError}</p>
                </div>
              </div>
            ) : upcomingPreview.length === 0 ? (
              <div className="appointments-list">
                <div className="appointment-card">
                  <p>{t('Предстоящих консультаций нет.', 'No upcoming consultations yet.')}</p>
                </div>
              </div>
            ) : (
              <div className="appointments-list">
                {upcomingPreview.map((consultation) => {
                  const start = consultation.slot_start_time ? new Date(consultation.slot_start_time) : null;
                  const formattedDate = start
                    ? start.toLocaleDateString(isEnglish ? 'en-US' : 'ru-RU', { day: '2-digit', month: 'long' })
                    : '—';
                  const formattedTime = start
                    ? start.toLocaleTimeString(isEnglish ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
                    : '—';

                  const endTime = consultation.slot_end_time
                    ? new Date(consultation.slot_end_time).toLocaleTimeString(isEnglish ? 'en-US' : 'ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  const title =
                    user?.role === 'doctor'
                      ? consultation.patient_name || consultation.patient_email || t('Пациент', 'Patient')
                      : consultation.doctor_name || t('Врач DocLink', 'DocLink doctor');
                  const subtitle =
                    user?.role === 'doctor'
                      ? consultation.patient_email || ''
                      : consultation.doctor_specialty || consultation.doctor_email || '';

                  return (
                    <div key={consultation.id} className="appointment-card">
                      <div className="appointment-avatar">{title.charAt(0).toUpperCase()}</div>
                      <div className="appointment-details">
                        <h3>{title}</h3>
                        <p>{subtitle}</p>
                      </div>
                      <div className="appointment-time">
                        <div className="time-badge">{formattedDate}</div>
                        <p>
                          {formattedTime}
                          {endTime ? ` — ${endTime}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
