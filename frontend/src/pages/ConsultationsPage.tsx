import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { renderIcon } from '../components/Icons';
import api from '../services/api';
import { useAuth } from '../services/AuthContext';
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
  const isDoctor = user?.role === 'doctor';
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
        setError('Не удалось загрузить список консультаций.');
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
      await api.post(`/consultations/${consultationId}/cancel`, { reason: 'Отменено пациентом' });
      setConsultations((prev) =>
        prev.map((consultation) =>
          consultation.id === consultationId ? { ...consultation, status: 'cancelled' } : consultation,
        ),
      );
      setActionMessage('Консультация отменена.');
    } catch {
      setActionMessage('Не удалось отменить консультацию.');
    }
  };

  const renderConsultationList = () => {
    const list = groupedConsultations[activeTab];
    if (loading) {
      return (
        <div className="consultations-list">
          <div className="no-consultations">
            <p>Загружаем консультации…</p>
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
            <p>Консультаций в этой категории пока нет.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="consultations-list">
        {list.map((consultation) => {
          const start = consultation.slot_start_time ? new Date(consultation.slot_start_time) : null;
          const formattedDate = start
            ? start.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })
            : '—';
          const formattedTime = start ? start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';
          return (
            <div key={consultation.id} className={`consultation-item status-${consultation.status}`}>
              <div className="consultation-header">
                <div className="consultation-doctor">
                  <div className="doctor-avatar">
                    {(isDoctor ? consultation.patient_name ?? 'П' : consultation.doctor_name ?? 'В').charAt(0).toUpperCase()}
                  </div>
                  <div className="doctor-info">
                    <h3 className="doctor-name">
                      {isDoctor ? consultation.patient_name ?? 'Пациент' : consultation.doctor_name ?? 'Врач'}
                    </h3>
                    <p className="doctor-specialty">
                      {isDoctor ? consultation.patient_email ?? 'Пациент DocLink' : consultation.doctor_specialty ?? 'Специалист DocLink'}
                    </p>
                  </div>
                </div>
                <div className={`status-badge status-${consultation.status}`}>
                  {consultation.status === 'created' && 'Запланирована'}
                  {consultation.status === 'active' && 'Идёт сейчас'}
                  {consultation.status === 'completed' && 'Завершена'}
                  {consultation.status === 'cancelled' && 'Отменена'}
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
                    {renderIcon('video', 16)} Присоединиться
                  </button>
                  {!isDoctor && (
                    <button className="btn-cancel-consultation" onClick={() => handleCancel(consultation.id)}>
                      Отменить
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
            <h1>{isDoctor ? 'Консультации врача' : 'Мои консультации'}</h1>
            <p className="subtitle">
              {isDoctor
                ? 'Следите за расписанием и подключайтесь к видеокомнатам пациентов'
                : 'Управление всеми вашими консультациями с врачами'}
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
                Предстоящие
              </button>
              <button
                className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                {renderIcon('check-circle', 18)}
                Завершённые
              </button>
              <button
                className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
                onClick={() => setActiveTab('cancelled')}
              >
                {renderIcon('x-circle', 18)}
                Отменённые
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
