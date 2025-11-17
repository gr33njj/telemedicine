import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { renderIcon } from '../components/Icons';
import api from '../services/api';
import { useAuth } from '../services/AuthContext';
import { usePreferences } from '../services/PreferencesContext';
import '../App.css';
import './ConsultationsPage.css';

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

const ConsultationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = usePreferences();
  const isEnglish = language === 'en';
  const t = (ru: string, en: string) => (isEnglish ? en : ru);
  const isDoctor = user?.role === 'doctor';
  const locale = isEnglish ? 'en-US' : 'ru-RU';
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<Consultation[]>('/consultations/history', { params: { limit: 50 } });
        setConsultations(data);
      } catch {
        setError(t('Не удалось загрузить список консультаций.', 'Failed to load consultations.'));
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, []);

  const groupedConsultations = useMemo<Record<'upcoming' | 'completed' | 'cancelled', Consultation[]>>(() => {
    const upcoming = consultations.filter((consultation) =>
      consultation.status === 'created' || consultation.status === 'active',
    );
    const completed = consultations.filter((consultation) => consultation.status === 'completed');
    const cancelled = consultations.filter((consultation) => consultation.status === 'cancelled');
    return { upcoming, completed, cancelled };
  }, [consultations]);

  const handleCancel = async (consultationId: number) => {
    if (isDoctor) return;
    try {
      await api.post(`/consultations/${consultationId}/cancel`, {
        reason: t('Отменено пациентом', 'Cancelled by patient'),
      });
      setConsultations((prev) =>
        prev.map((consultation) =>
          consultation.id === consultationId ? { ...consultation, status: 'cancelled' } : consultation,
        ),
      );
      setActionMessage(t('Консультация отменена.', 'Consultation cancelled.'));
    } catch {
      setActionMessage(t('Не удалось отменить консультацию.', 'Failed to cancel consultation.'));
    }
  };

  const renderConsultationList = () => {
    const list = groupedConsultations[activeTab];
    if (loading) {
      return (
        <div className="consultations-list">
          <div className="no-consultations">
            <p>{t('Загружаем консультации…', 'Loading consultations…')}</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="consultations-list">
          <div className="no-consultations">
            <p>{error}</p>
          </div>
        </div>
      );
    }

    if (!list || list.length === 0) {
      return (
        <div className="consultations-list">
          <div className="no-consultations">
            <p>{t('Консультаций в этой категории пока нет.', 'No consultations in this category yet.')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="consultations-list">
        {list.map((consultation) => {
          const start = consultation.slot_start_time ? new Date(consultation.slot_start_time) : null;
          const formattedDate = start ? start.toLocaleDateString(locale, { day: '2-digit', month: 'long' }) : '—';
          const formattedTime = start ? start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—';
          return (
            <div key={consultation.id} className={`consultation-item status-${consultation.status}`}>
              <div className="consultation-header">
                <div className="consultation-doctor">
                  <div className="doctor-avatar">
                    {(isDoctor ? consultation.patient_name ?? 'П' : consultation.doctor_name ?? 'В').charAt(0).toUpperCase()}
                  </div>
                  <div className="doctor-info">
                    <h3 className="doctor-name">
                      {isDoctor ? consultation.patient_name ?? t('Пациент', 'Patient') : consultation.doctor_name ?? t('Врач', 'Doctor')}
                    </h3>
                    <p className="doctor-specialty">
                      {isDoctor
                        ? consultation.patient_email ?? 'DocLink'
                        : consultation.doctor_specialty ?? t('Специалист DocLink', 'DocLink specialist')}
                    </p>
                  </div>
                </div>
                <div className={`status-badge status-${consultation.status}`}>
                  {consultation.status === 'created' && t('Запланирована', 'Scheduled')}
                  {consultation.status === 'active' && t('Идёт сейчас', 'In progress')}
                  {consultation.status === 'completed' && t('Завершена', 'Completed')}
                  {consultation.status === 'cancelled' && t('Отменена', 'Cancelled')}
                </div>
              </div>

              <div className="consultation-details">
                <div className="detail-item">
                  {renderIcon('calendar', 18)}
                  <span>{formattedDate}</span>
                </div>
                <div className="detail-item">
                  {renderIcon('clock', 18)}
                  <span>{formattedTime}</span>
                </div>
              </div>

              {activeTab === 'upcoming' && (
                <div className="consultation-actions">
                  <button
                    className="btn-join"
                    onClick={() => navigate(`/consultation-room/${consultation.id}`)}
                  >
                    {renderIcon('video', 16)} {t('Присоединиться', 'Join')}
                  </button>
                  {!isDoctor && (
                    <button className="btn-cancel-consultation" onClick={() => handleCancel(consultation.id)}>
                      {t('Отменить', 'Cancel')}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="consultations-page">
      <Navigation />

      <main className="consultations-main">
        <div className="container">
          <section className="consultations-header">
            <h1>{isDoctor ? t('Консультации врача', 'Doctor consultations') : t('Мои консультации', 'My consultations')}</h1>
            <p className="subtitle">
              {isDoctor
                ? t('Следите за расписанием и подключайтесь к видеокомнатам пациентов', 'Track your schedule and join patient rooms')
                : t('Управление всеми вашими консультациями с врачами', 'Manage all consultations with your doctors')}
            </p>
          </section>

          {actionMessage && (
            <div className="consultations-banner" onClick={() => setActionMessage(null)}>
              {actionMessage}
            </div>
          )}

          <section className="consultations-tabs">
            <div className="tabs-container">
              <button
                className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                {renderIcon('calendar', 18)}
                {t('Предстоящие', 'Upcoming')}
              </button>
              <button
                className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                {renderIcon('check-circle', 18)}
                {t('Завершённые', 'Completed')}
              </button>
              <button
                className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
                onClick={() => setActiveTab('cancelled')}
              >
                {renderIcon('x-circle', 18)}
                {t('Отменённые', 'Cancelled')}
              </button>
            </div>
          </section>

          {renderConsultationList()}
        </div>
      </main>
    </div>
  );
};

export default ConsultationsPage;
