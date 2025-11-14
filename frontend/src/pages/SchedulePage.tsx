import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { renderIcon } from '../components/Icons';
import api from '../services/api';
import '../App.css';
import './SchedulePage.css';

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

const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

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

const formatDoctorName = (doctor?: Doctor | null) =>
  doctor ? `${doctor.first_name ?? ''} ${doctor.last_name ?? ''}`.trim() || 'Врач DocLink' : 'Врач DocLink';

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

  const calendarReference = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => getCalendarDays(calendarReference), [calendarReference]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await api.get<Doctor[]>('/doctors/list');
        setDoctors(data);
      } catch {
        setError('Не удалось загрузить врачей. Попробуйте обновить страницу.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        setSlotsLoading(true);
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
                timeLabel: `${start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · ${Math.round(
                  (endTime.getTime() - start.getTime()) / 60000,
                )} мин`,
              };
            })
            .sort((a, b) => a.start.getTime() - b.start.getTime());
        });
        setSlotsByDoctor(normalized);
      } catch {
        setError('Не удалось загрузить доступные слоты.');
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, []);

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

  const handleConfirmBooking = async () => {
    if (!selectedDoctorId || !selectedSlot || !currentDoctor) return;
    try {
      setBookingState('loading');
      await api.post('/consultations/book', {
        doctor_id: selectedDoctorId,
        slot_id: selectedSlot.id,
        points_cost: currentDoctor.consultation_price_points || 0,
      });
      setBanner('Консультация успешно забронирована. Найти её можно во вкладке «Консультации».');
      setSelectedSlot(null);

      // refresh slots after booking
      const updated = { ...slotsByDoctor };
      updated[selectedDoctorId] = (updated[selectedDoctorId] ?? []).filter((slot) => slot.id !== selectedSlot.id);
      setSlotsByDoctor(updated);
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? 'Не удалось забронировать слот. Попробуйте ещё раз.';
      setBanner(message);
    } finally {
      setBookingState('idle');
    }
  };

  return (
    <div className="schedule-page">
      <Navigation />

      <main className="schedule-main">
        <div className="container">
          <section className="schedule-header">
            <h1>Запись на консультацию</h1>
            <p className="subtitle">Выберите врача, дату и время консультации</p>
          </section>

          {banner && (
            <div className="schedule-banner" onClick={() => setBanner(null)}>
              {banner}
            </div>
          )}

          <div className="schedule-container">
            {/* Left: Doctor Selection */}
            <section className="doctor-selection">
              <h2>Выбор врача</h2>
              <div className="doctors-list">
                {loading && (
                  <div className="empty-doctors">Загружаем специалистов…</div>
                )}

                {!loading && doctors.length === 0 && (
                  <div className="empty-doctors">
                    Пока нет доступных врачей. Добавьте профиль врача в админ-панели.
                  </div>
                )}

                {!loading && doctors.map((doctor) => (
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
                          <img src={doctor.avatar_url} alt={doctor.first_name || 'Врач'} />
                        ) : (
                          (doctor.first_name ?? 'D').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="doctor-card-info">
                        <h3>{formatDoctorName(doctor)}</h3>
                        <p>{doctor.specialty ?? 'Специалист DocLink'}</p>
                        {doctor.short_description && <small>{doctor.short_description}</small>}
                      </div>
                    </div>
                    <div className="doctor-card-footer">
                      <div className="doctor-rating">
                        {renderIcon('star', 16)}
                        <span>{formatDoctorRating(doctor)}</span>
                      </div>
                      <div className="doctor-price">
                        {doctor.consultation_price_points ? `${doctor.consultation_price_points} pts` : 'Цена уточняется'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Right: Calendar and Slots */}
            <section className="calendar-slots-section">
              {/* Calendar */}
              <div className="calendar-container">
                <h2>Выбор даты</h2>
                <div className="calendar">
                  <div className="calendar-header">
                    <h3>Январь 2024</h3>
                  </div>
                  <div className="calendar-weekdays">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                      <div key={day} className="weekday">{day}</div>
                    ))}
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

              {/* Time Slots */}
              <div className="slots-container">
                <h2>Выбор времени</h2>
                {slotsLoading && (
                  <div className="slots-empty">Загружаем свободные слоты…</div>
                )}

                {!slotsLoading && selectedDoctorId && availableDates.size === 0 && (
                  <div className="slots-empty">
                    У этого врача пока нет свободных слотов. Попробуйте выбрать другого специалиста.
                  </div>
                )}

                {!slotsLoading && selectedDoctorId && availableDates.size > 0 && slotsForSelectedDay.length === 0 && (
                  <div className="slots-empty">
                    На выбранную дату нет свободного времени. Выберите другую дату.
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

          {/* Booking Summary Modal */}
          {currentDoctor && selectedDate && selectedSlot && (
            <>
              <div className="modal-overlay"></div>
              <div className="booking-modal">
                <div className="modal-header">
                  <h2>Подтверждение записи</h2>
                </div>
                <div className="modal-body">
                  <div className="summary-item">
                    <span className="summary-label">Врач:</span>
                    <span className="summary-value">{formatDoctorName(currentDoctor)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Специальность:</span>
                    <span className="summary-value">{currentDoctor.specialty || '—'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Дата:</span>
                    <span className="summary-value">
                      {new Date(selectedSlot.start).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: 'long',
                      })}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Время:</span>
                    <span className="summary-value">
                      {selectedSlot.start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="summary-item summary-price">
                    <span className="summary-label">Стоимость:</span>
                    <span className="summary-value">
                      {currentDoctor.consultation_price_points
                        ? `${currentDoctor.consultation_price_points} pts`
                        : 'Цена уточняется'}
                    </span>
                  </div>
                </div>
                <div className="modal-actions">
                  <button 
                    className="btn-cancel-modal"
                    onClick={() => setSelectedSlot(null)}
                  >
                    Отменить
                  </button>
                  <button
                    className="btn-book-modal"
                    onClick={handleConfirmBooking}
                    disabled={bookingState === 'loading'}
                  >
                    {bookingState === 'loading' ? 'Бронирование...' : 'Подтвердить запись'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SchedulePage;
