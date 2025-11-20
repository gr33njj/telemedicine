import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { renderIcon } from '../components/Icons';
import api from '../services/api';
import { useAuth } from '../services/AuthContext';
import { usePreferences } from '../services/PreferencesContext';
import '../App.css';
import './SchedulePage.css';
import '../styles/Dashboard.css';

interface Doctor {
  id: number;
  first_name?: string;
  last_name?: string;
  specialty?: string;
  experience_years?: number;
  consultation_price_points: number;
  is_verified: boolean;
  short_description?: string;
  avatar_url?: string;
  rating?: number;
  reviews_count?: number;
}

interface ApiSlot {
  id: number;
  doctor_id: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_reserved: boolean;
}

interface ApiSlotGroup {
  doctor_id: number;
  doctor_name: string;
  slots: ApiSlot[];
}

interface NormalizedSlot {
  id: number;
  doctorId: number;
  start: Date;
  end: Date;
  dateKey: string;
  timeLabel: string;
}

interface SlotDraft {
  start_time: string;
  end_time: string;
  label: string;
}

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCalendarDays = (reference: Date) => {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay() || 7;
  const days: Array<Date | null> = [];

  for (let i = 1; i < firstDay; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
};

const formatDoctorName = (doctor?: Doctor | null, fallback?: string) => {
  if (!doctor) {
    return fallback || 'DocLink Doctor';
  }
  const name = `${doctor.first_name ?? ''} ${doctor.last_name ?? ''}`.trim();
  return name || fallback || 'DocLink Doctor';
};

const formatDoctorRating = (doctor?: Doctor | null) => {
  if (!doctor || doctor.rating === undefined || doctor.rating === null) {
    if (doctor?.experience_years) {
      return (4.4 + Math.min(0.4, doctor.experience_years * 0.02)).toFixed(1);
    }
    return '4.5';
  }
  const numeric = Number(doctor.rating);
  return Number.isNaN(numeric) ? '4.5' : numeric.toFixed(1);
};

const SchedulePage: React.FC = () => {
  const location = useLocation();
  const pendingDoctorId = (location.state as { doctorId?: number })?.doctorId;
  const { user } = useAuth();
  const { language } = usePreferences();
  const isDoctor = user?.role === 'doctor';
  const isEnglish = language === 'en';
  const locale = isEnglish ? 'en-US' : 'ru-RU';
  const t = (ru: string, en: string) => (isEnglish ? en : ru);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slotsByDoctor, setSlotsByDoctor] = useState<Record<number, NormalizedSlot[]>>({});
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<NormalizedSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [bookingState, setBookingState] = useState<'idle' | 'loading'>('idle');
  const [slotDrafts, setSlotDrafts] = useState<SlotDraft[]>([]);
  const [slotDraftDate, setSlotDraftDate] = useState('');
  const [slotDraftTime, setSlotDraftTime] = useState('');
  const [slotDraftDuration, setSlotDraftDuration] = useState(30);
  const [doctorSlots, setDoctorSlots] = useState<ApiSlot[]>([]);
  const [doctorSlotsLoading, setDoctorSlotsLoading] = useState(false);
  const [doctorSlotsError, setDoctorSlotsError] = useState<string | null>(null);
  const [savingDoctorSlots, setSavingDoctorSlots] = useState(false);

  const calendarReference = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => getCalendarDays(calendarReference), [calendarReference]);

  useEffect(() => {
    if (isDoctor) {
      setLoading(false);
      return;
    }
    const fetchDoctors = async () => {
      try {
        const { data } = await api.get<Doctor[]>('/doctors/list');
        setDoctors(data);
      } catch {
        setError(
          isEnglish ? 'Failed to load doctors. Please refresh.' : 'Не удалось загрузить врачей. Попробуйте обновить страницу.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [isDoctor, isEnglish]);

  const fetchAvailableSlots = useCallback(
    async (withSpinner = true) => {
      try {
        if (withSpinner) {
          setSlotsLoading(true);
        }
        const now = new Date();
        const end = new Date();
        end.setDate(now.getDate() + 30);
        const { data } = await api.get<ApiSlotGroup[]>('/schedule/available', {
          params: {
            start_date: now.toISOString(),
            end_date: end.toISOString(),
          },
        });

        const normalized: Record<number, NormalizedSlot[]> = {};
        data.forEach((group) => {
          normalized[group.doctor_id] = group.slots
            .filter((slot) => slot.is_available && !slot.is_reserved)
            .map((slot) => {
              const start = new Date(slot.start_time);
              const endTime = new Date(slot.end_time);
              return {
                id: slot.id,
                doctorId: group.doctor_id,
                start,
                end: endTime,
                dateKey: formatDateKey(start),
                timeLabel: `${start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · ${Math.round(
                  (endTime.getTime() - start.getTime()) / 60000,
                )} ${isEnglish ? 'min' : 'мин'}`,
              };
            })
            .sort((a, b) => a.start.getTime() - b.start.getTime());
        });
        setSlotsByDoctor(normalized);
        setError(null);
      } catch {
        setError(isEnglish ? 'Failed to load available slots.' : 'Не удалось загрузить доступные слоты.');
      } finally {
        if (withSpinner) {
          setSlotsLoading(false);
        }
      }
    },
    [locale, isEnglish],
  );

  useEffect(() => {
    if (isDoctor) return;
    fetchAvailableSlots(true);
  }, [isDoctor, fetchAvailableSlots]);

  useEffect(() => {
    if (isDoctor) return;
    const interval = setInterval(() => {
      fetchAvailableSlots(false);
    }, 45000);
    return () => clearInterval(interval);
  }, [isDoctor, fetchAvailableSlots]);

  useEffect(() => {
    if (!isDoctor) return;
    const fetchDoctorSlots = async () => {
      try {
        setDoctorSlotsLoading(true);
        setDoctorSlotsError(null);
        const { data } = await api.get<ApiSlot[]>('/schedule/slots');
        setDoctorSlots(data);
      } catch {
        setDoctorSlotsError(isEnglish ? 'Failed to load your schedule.' : 'Не удалось загрузить ваше расписание.');
      } finally {
        setDoctorSlotsLoading(false);
      }
    };

    fetchDoctorSlots();
  }, [isDoctor, isEnglish]);

  useEffect(() => {
    if (!doctors.length) return;
    const doctorFromLink = doctors.find((doctor) => doctor.id === pendingDoctorId);
    const defaultDoctor = doctorFromLink ?? doctors[0];
    setSelectedDoctorId(defaultDoctor.id);
  }, [doctors, pendingDoctorId]);

  useEffect(() => {
    if (!selectedDoctorId) return;
    const doctorSlots = slotsByDoctor[selectedDoctorId] ?? [];
    if (doctorSlots.length === 0) {
      setSelectedDate('');
      setSelectedSlot(null);
      return;
    }

    if (!doctorSlots.some((slot) => slot.dateKey === selectedDate)) {
      setSelectedDate(doctorSlots[0].dateKey);
      setSelectedSlot(null);
    }
  }, [selectedDoctorId, slotsByDoctor, selectedDate]);

  const currentDoctor = useMemo(() => doctors.find((doctor) => doctor.id === selectedDoctorId) ?? null, [doctors, selectedDoctorId]);

  const availableDates = useMemo(() => {
    if (!selectedDoctorId) return new Set<string>();
    const doctorSlots = slotsByDoctor[selectedDoctorId] ?? [];
    return new Set(doctorSlots.map((slot) => slot.dateKey));
  }, [selectedDoctorId, slotsByDoctor]);

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDoctorId || !selectedDate) return [];
    return (slotsByDoctor[selectedDoctorId] ?? []).filter((slot) => slot.dateKey === selectedDate);
  }, [selectedDoctorId, selectedDate, slotsByDoctor]);

  const sortedDoctorSlots = useMemo(() => {
    return [...doctorSlots].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
  }, [doctorSlots]);

  const addSlotDraft = () => {
    if (!slotDraftDate || !slotDraftTime || slotDraftDuration <= 0) return;
    const start = new Date(`${slotDraftDate}T${slotDraftTime}`);
    const end = new Date(start.getTime() + slotDraftDuration * 60000);
    const label = `${start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })}, ${start.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })} · ${slotDraftDuration} ${isEnglish ? 'min' : 'мин'}`;
    setSlotDrafts((prev) => [...prev, { start_time: start.toISOString(), end_time: end.toISOString(), label }]);
    setSlotDraftTime('');
  };

  const removeSlotDraft = (index: number) => {
    setSlotDrafts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const saveDoctorSlots = async () => {
    if (slotDrafts.length === 0) {
      setBanner(isEnglish ? 'Add at least one slot before saving.' : 'Добавьте хотя бы один слот перед сохранением');
      return;
    }
    try {
      setSavingDoctorSlots(true);
      await api.post('/schedule/slots/bulk', {
        slots: slotDrafts.map(({ start_time, end_time }) => ({ start_time, end_time })),
      });
      setBanner(isEnglish ? 'Schedule updated.' : 'Расписание обновлено.');
      setSlotDrafts([]);
      setSlotDraftDate('');
      setSlotDraftTime('');
      const { data } = await api.get<ApiSlot[]>('/schedule/slots');
      setDoctorSlots(data);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') {
        setBanner(detail);
      } else {
        setBanner(isEnglish ? 'Failed to create slots.' : 'Не удалось создать слоты.');
      }
    } finally {
      setSavingDoctorSlots(false);
    }
  };

  const handleDeleteDoctorSlot = async (slotId: number) => {
    try {
      await api.delete(`/schedule/slots/${slotId}`);
      setDoctorSlots((prev) => prev.filter((slot) => slot.id !== slotId));
      setBanner(isEnglish ? 'Slot removed.' : 'Слот удалён.');
    } catch {
      setBanner(
        isEnglish ? 'Unable to delete slot (it might be already booked).' : 'Не удалось удалить слот (возможно, он забронирован).',
      );
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctorId || !selectedSlot || !currentDoctor) return;
    try {
      setBookingState('loading');
      await api.post('/consultations/book', {
        doctor_id: selectedDoctorId,
        slot_id: selectedSlot.id,
        points_cost: currentDoctor.consultation_price_points || 0,
      });
      setBanner(
        isEnglish
          ? 'Consultation booked successfully. You can find it in the “Consultations” section.'
          : 'Консультация успешно забронирована. Найти её можно во вкладке «Консультации».',
      );
      setSelectedSlot(null);

      // refresh slots after booking
      const updated = { ...slotsByDoctor };
      updated[selectedDoctorId] = (updated[selectedDoctorId] ?? []).filter((slot) => slot.id !== selectedSlot.id);
      setSlotsByDoctor(updated);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ??
        (isEnglish ? 'Unable to book the slot. Please try again.' : 'Не удалось забронировать слот. Попробуйте ещё раз.');
      setBanner(message);
    } finally {
      setBookingState('idle');
    }
  };

  if (isDoctor) {
  return (
      <div className="dashboard-wrapper">
        <div className="dashboard-bg-blob dashboard-blob-1"></div>
        <div className="dashboard-bg-blob dashboard-blob-2"></div>
        <div className="dashboard-bg-blob dashboard-blob-3"></div>
        
        <Navigation />

        <div className="dashboard-content">
            <section className="schedule-header">
              <h1>{t('Расписание врача', 'Doctor schedule')}</h1>
              <p className="subtitle">
                {t(
                  'Создавайте рабочие окна для пациентов и управляйте доступностью.',
                  'Create availability slots for patients and manage your schedule.',
                )}
              </p>
            </section>

            {banner && (
              <div className="schedule-banner" onClick={() => setBanner(null)}>
                {banner}
              </div>
            )}

            <div className="doctor-schedule-grid">
              <section className="doctor-schedule-card">
                <h2>{t('Создать слоты', 'Create slots')}</h2>
                <p className="doctor-card-subtitle">
                  {t('Выберите дату, время и длительность. Слоты не должны пересекаться.', 'Pick date, time and duration. Slots cannot overlap.')}
                </p>
                <div className="doctor-slot-form">
                  <label>
                    {t('Дата', 'Date')}
                    <input type="date" value={slotDraftDate} onChange={(e) => setSlotDraftDate(e.target.value)} />
                  </label>
                  <label>
                    {t('Время начала', 'Start time')}
                    <input type="time" value={slotDraftTime} onChange={(e) => setSlotDraftTime(e.target.value)} />
                  </label>
                  <label>
                    {t('Длительность (мин)', 'Duration (min)')}
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={slotDraftDuration}
                      onChange={(e) => setSlotDraftDuration(Number(e.target.value))}
                    />
                  </label>
                  <button className="btn btn-secondary" type="button" onClick={addSlotDraft}>
                    {t('Добавить слот', 'Add slot')}
                  </button>
                </div>
                {slotDrafts.length > 0 && (
                  <div className="doctor-drafts">
                    <h4>{t('Черновики', 'Draft slots')}</h4>
                    {slotDrafts.map((slot, index) => (
                      <div key={slot.start_time} className="doctor-draft-item">
                        <span>{slot.label}</span>
                        <button className="btn btn-text" onClick={() => removeSlotDraft(index)}>
                          {t('Удалить', 'Remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="doctor-form-actions">
                  <button className="btn btn-primary" disabled={savingDoctorSlots || slotDrafts.length === 0} onClick={saveDoctorSlots}>
                    {savingDoctorSlots ? t('Сохраняем…', 'Saving…') : t('Сохранить слоты', 'Save slots')}
                  </button>
                </div>
              </section>

              <section className="doctor-schedule-card">
                <h2>{t('Текущее расписание', 'Current schedule')}</h2>
                {doctorSlotsLoading ? (
                  <div className="doctor-empty">{t('Загружаем текущие слоты…', 'Loading your slots…')}</div>
                ) : doctorSlotsError ? (
                  <div className="doctor-empty">{doctorSlotsError}</div>
                ) : sortedDoctorSlots.length === 0 ? (
                  <div className="doctor-empty">{t('Слотов пока нет. Добавьте новое окно.', 'No slots yet. Add a new window.')}</div>
                ) : (
                  <div className="doctor-slots-list">
                    {sortedDoctorSlots.map((slot) => {
                      const start = new Date(slot.start_time);
                      const end = new Date(slot.end_time);
                      return (
                        <div key={slot.id} className="doctor-slot-item">
                          <div>
                            <div className="doctor-slot-date">
                              {start.toLocaleDateString(locale, { day: '2-digit', month: 'long' })},{' '}
                              {start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} —{' '}
                              {end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <span className={`doctor-slot-status ${slot.is_reserved ? 'reserved' : 'available'}`}>
                              {slot.is_reserved ? t('Забронирован', 'Booked') : t('Свободен', 'Available')}
                            </span>
                          </div>
                          <button
                            className="btn btn-text danger"
                            disabled={slot.is_reserved}
                            onClick={() => handleDeleteDoctorSlot(slot.id)}
                          >
                            {t('Удалить', 'Delete')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-bg-blob dashboard-blob-1"></div>
      <div className="dashboard-bg-blob dashboard-blob-2"></div>
      <div className="dashboard-bg-blob dashboard-blob-3"></div>
      
      <Navigation />

      <div className="dashboard-content">
          <section className="schedule-header">
            <h1>{t('Запись на консультацию', 'Book a consultation')}</h1>
            <p className="subtitle">
              {t('Выберите врача, дату и время консультации', 'Choose a doctor, date and time for your consultation')}
            </p>
            <div className="schedule-actions">
              <button
                className="btn btn-text"
                type="button"
                onClick={() => fetchAvailableSlots(true)}
                disabled={slotsLoading}
              >
                {slotsLoading ? t('Обновляем…', 'Refreshing…') : t('Обновить расписание', 'Refresh schedule')}
              </button>
            </div>
          </section>

          {banner && (
            <div className="schedule-banner" onClick={() => setBanner(null)}>
              {banner}
            </div>
          )}

          <div className="schedule-container">
            <section className="doctor-selection">
              <h2>{t('Выбор врача', 'Doctor selection')}</h2>
              <div className="doctors-list">
                {loading && <div className="empty-doctors">{t('Загружаем специалистов…', 'Loading doctors…')}</div>}
                {!loading && doctors.length === 0 && (
                  <div className="empty-doctors">
                    {t(
                      'Пока нет доступных врачей. Добавьте профиль врача в админ-панели.',
                      'No doctors available yet. Add a doctor profile in the admin panel.',
                    )}
                  </div>
                )}
                {!loading &&
                  doctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      className={`doctor-card ${selectedDoctorId === doctor.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedDoctorId(doctor.id);
                        setSelectedSlot(null);
                      }}
                    >
                      <div className="doctor-card-header">
                        <div className="doctor-avatar">
                          {doctor.avatar_url ? (
                            <img src={doctor.avatar_url} alt={doctor.first_name || 'Doctor'} />
                          ) : (
                            (doctor.first_name ?? 'D').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="doctor-card-info">
                          <h3>{formatDoctorName(doctor, t('Врач DocLink', 'DocLink doctor'))}</h3>
                          <p>{doctor.specialty ?? t('Специалист DocLink', 'DocLink specialist')}</p>
                          {doctor.short_description && <small>{doctor.short_description}</small>}
                        </div>
                      </div>
                      <div className="doctor-card-footer">
                        <div className="doctor-rating">
                          {renderIcon('star', 16)}
                          <span>{formatDoctorRating(doctor)}</span>
                        </div>
                        <div className="doctor-price">
                          {doctor.consultation_price_points
                            ? `${doctor.consultation_price_points} pts`
                            : t('Цена уточняется', 'Price on request')}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            <section className="calendar-slots-section">
              <div className="calendar-container">
                <h2>{t('Выбор даты', 'Choose a date')}</h2>
                <div className="calendar">
                  <div className="calendar-header">
                    <h3>
                      {calendarReference.toLocaleDateString(locale, {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </h3>
                  </div>
                  <div className="calendar-weekdays">
                    {(isEnglish ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']).map(
                      (day) => (
                        <div key={day} className="weekday">
                          {day}
                        </div>
                      ),
                    )}
                  </div>
                  <div className="calendar-days">
                    {calendarDays.map((date, index) => {
                      if (!date) {
                        return <div key={`empty-${index}`} className="calendar-day empty" />;
                      }
                      const dateKey = formatDateKey(date);
                      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                      const hasSlots = availableDates.has(dateKey);
                      const isSelected = selectedDate === dateKey;

                      return (
                        <div
                          key={date.toISOString()}
                          className={`calendar-day ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''} ${
                            hasSlots ? 'has-slots' : ''
                          }`}
                          onClick={() => {
                            if (!isPast && hasSlots) {
                              setSelectedDate(dateKey);
                              setSelectedSlot(null);
                            }
                          }}
                        >
                          {date.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="slots-container">
                <h2>{t('Выбор времени', 'Choose a time')}</h2>
                {slotsLoading && <div className="slots-empty">{t('Загружаем свободные слоты…', 'Loading slots…')}</div>}
                {!slotsLoading && selectedDoctorId && availableDates.size === 0 && (
                  <div className="slots-empty">
                    {t(
                      'У этого врача пока нет свободных слотов. Попробуйте выбрать другого специалиста.',
                      'This doctor has no available slots yet. Try another specialist.',
                    )}
                  </div>
                )}
                {!slotsLoading && selectedDoctorId && availableDates.size > 0 && slotsForSelectedDay.length === 0 && (
                  <div className="slots-empty">
                    {t(
                      'На выбранную дату нет свободного времени. Выберите другую дату.',
                      'No times are available on the selected date. Choose another day.',
                    )}
                  </div>
                )}
                {!slotsLoading && slotsForSelectedDay.length > 0 && (
                  <div className="slots-grid">
                    {slotsForSelectedDay.map((slot) => (
                      <button
                        key={slot.id}
                        className={`slot-button ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot.timeLabel}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {currentDoctor && selectedDate && selectedSlot && (
            <>
              <div className="modal-overlay"></div>
              <div className="booking-modal">
                <div className="modal-header">
                  <h2>{t('Подтверждение записи', 'Booking confirmation')}</h2>
                </div>
                <div className="modal-body">
                  <div className="summary-item">
                    <span className="summary-label">{t('Врач:', 'Doctor:')}</span>
                    <span className="summary-value">{formatDoctorName(currentDoctor, t('Врач DocLink', 'DocLink doctor'))}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">{t('Специальность:', 'Specialty:')}</span>
                    <span className="summary-value">{currentDoctor.specialty || '—'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">{t('Дата:', 'Date:')}</span>
                    <span className="summary-value">
                      {new Date(selectedSlot.start).toLocaleDateString(locale, {
                        day: '2-digit',
                        month: 'long',
                      })}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">{t('Время:', 'Time:')}</span>
                    <span className="summary-value">
                      {selectedSlot.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="summary-item summary-price">
                    <span className="summary-label">{t('Стоимость:', 'Price:')}</span>
                    <span className="summary-value">
                      {currentDoctor.consultation_price_points
                        ? `${currentDoctor.consultation_price_points} pts`
                        : t('Цена уточняется', 'Price on request')}
                    </span>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn-cancel-modal" onClick={() => setSelectedSlot(null)}>
                    {t('Отменить', 'Cancel')}
                  </button>
                  <button className="btn-book-modal" onClick={handleConfirmBooking} disabled={bookingState === 'loading'}>
                    {bookingState === 'loading' ? t('Бронирование...', 'Booking...') : t('Подтвердить запись', 'Confirm booking')}
                  </button>
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
};

export default SchedulePage;
