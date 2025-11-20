import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { renderIcon } from '../components/Icons';
import api from '../services/api';
import { usePreferences } from '../services/PreferencesContext';
import '../App.css';
import './DoctorsPage.css';
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
  bio?: string;
  avatar_url?: string;
  rating?: number;
  reviews_count?: number;
}

const formatName = (doctor: Doctor, language: 'ru' | 'en') =>
  `${doctor.first_name ?? ''} ${doctor.last_name ?? ''}`.trim() ||
  (language === 'en' ? 'DocLink Doctor' : 'Врач DocLink');

const buildDescription = (doctor: Doctor, translate: (ru: string, en: string) => string) => {
  if (doctor.short_description) {
    return doctor.short_description;
  }
  const specialty = doctor.specialty ?? translate('Врач', 'Doctor');
  if (doctor.experience_years) {
    return translate(
      `${specialty} с ${doctor.experience_years}+ годами практики.`,
      `${specialty} with ${doctor.experience_years}+ years of practice.`,
    );
  }
  return translate(`${specialty} DocLink, специализируется на онлайн-консультациях.`, `${specialty} at DocLink, focused on online consultations.`);
};

const computeRating = (doctor: Doctor) => {
  if (doctor.rating !== undefined && doctor.rating !== null) {
    const numeric = Number(doctor.rating);
    if (!Number.isNaN(numeric)) {
      return numeric.toFixed(1);
    }
  }
  const base = 4.4;
  const bonus = Math.min((doctor.experience_years ?? 0) * 0.02, 0.4);
  return (base + bonus).toFixed(1);
};

const computeReviews = (doctor: Doctor) => {
  if (doctor.reviews_count !== undefined && doctor.reviews_count !== null) {
    const numeric = Number(doctor.reviews_count);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return 25 + (doctor.experience_years ?? 1) * 3;
};

const DoctorsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = usePreferences();
  const isEnglish = language === 'en';
  const t = (ru: string, en: string) => (isEnglish ? en : ru);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const specialtyOptions = useMemo(() => ['all', ...specialties], [specialties]);

  useEffect(() => {
  const fetchDoctors = async () => {
    try {
        setLoading(true);
        const { data } = await api.get<Doctor[]>('/doctors/list');
        setDoctors(data);
        setError(null);
        const uniqueSpecialties = Array.from(
          new Set(
            data
              .map((doctor) => doctor.specialty?.trim())
              .filter((value): value is string => Boolean(value && value.length)),
          ),
        ).sort((a, b) => a.localeCompare(b, 'ru'));
        setSpecialties(uniqueSpecialties);
      } catch (err) {
        setError(t('Не удалось загрузить список врачей. Попробуйте обновить страницу.', 'Failed to load doctors. Please refresh.'));
    } finally {
      setLoading(false);
    }
  };

    fetchDoctors();
  }, [language]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const name = formatName(doctor, language).toLowerCase();
      const specialty = (doctor.specialty ?? '').toLowerCase();
      const matchSearch =
        name.includes(searchTerm.toLowerCase()) ||
        specialty.includes(searchTerm.toLowerCase());
      const matchSpecialty =
        selectedSpecialty === 'all' ||
        specialty === selectedSpecialty.toLowerCase();
      return matchSearch && matchSpecialty;
    });
  }, [doctors, language, searchTerm, selectedSpecialty]);

  const handleBook = (doctorId: number) => {
    navigate('/schedule', { state: { doctorId } });
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-bg-blob dashboard-blob-1"></div>
      <div className="dashboard-bg-blob dashboard-blob-2"></div>
      <div className="dashboard-bg-blob dashboard-blob-3"></div>
      
      <Navigation />

      <div className="dashboard-content">
          {/* Header */}
          <section className="doctors-header">
            <h1>{t('Наши врачи', 'Our doctors')}</h1>
            <p className="subtitle">
              {t('Выберите квалифицированного специалиста для консультации', 'Pick a verified specialist for your consultation')}
            </p>
          </section>

          {/* Filters */}
          <section className="doctors-filters">
            {/* Search */}
            <div className="search-box">
              <div className="search-input-wrapper">
                {renderIcon('search', 20)}
                <input
                  type="text"
                  placeholder={t('Поиск врача или специальности...', 'Search doctor or specialty...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
          </div>

            {/* Specialty Filter */}
            <div className="specialty-filter">
              {specialtyOptions.map((option) => (
                <button
                  key={option}
                  className={`filter-tag ${selectedSpecialty === option ? 'active' : ''}`}
                  onClick={() => setSelectedSpecialty(option)}
                >
                  {option === 'all'
                    ? t('Все специалисты', 'All specialists')
                    : option}
                </button>
        ))}
      </div>
          </section>

          {/* Doctors Grid */}
          <section className="doctors-grid">
            {loading && (
              <div className="no-doctors">
                <p>{t('Загружаем команду специалистов…', 'Loading our specialists…')}</p>
              </div>
            )}

            {!loading && error && (
              <div className="no-doctors">
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && filteredDoctors.length === 0 && (
              <div className="no-doctors">
                <p>{t('Врачи с такими параметрами пока не найдены.', 'No doctors found for these filters yet.')}</p>
              </div>
            )}

            {!loading && !error && filteredDoctors.length > 0 && (
              filteredDoctors.map((doctor) => {
                const name = formatName(doctor, language);
                const description = buildDescription(doctor, t);
                const rating = computeRating(doctor);
                const reviews = computeReviews(doctor);
                const isAvailable = doctor.is_verified;

                return (
                  <div key={doctor.id} className={`doctor-card-full ${!isAvailable ? 'unavailable' : ''}`}>
                    <div className="doctor-card-image">
                      {doctor.avatar_url ? (
                        <img className="doctor-avatar-large doctor-avatar-photo" src={doctor.avatar_url} alt={name} />
                      ) : (
                        <div className="doctor-avatar-large">{name.charAt(0).toUpperCase()}</div>
                      )}
                      {!isAvailable && (
                        <div className="unavailable-badge">На модерации</div>
                      )}
                    </div>

                    <div className="doctor-card-content">
                      <div className="doctor-header-info">
                        <h3 className="doctor-card-name">{name}</h3>
                    <p className="doctor-card-specialty">
                      {doctor.specialty ?? t('Специалист DocLink', 'DocLink specialist')}
                    </p>
                      </div>

                      <p className="doctor-description">{description}</p>

                      <div className="doctor-footer">
                        <div className="doctor-rating-info">
                          <div className="rating-stars">
                            {renderIcon('star', 16)}
                            <span className="rating-value">{rating}</span>
                          </div>
                        <span className="reviews-count">
                          ({reviews} {t('отзывов', 'reviews')})
                        </span>
                        </div>
                        <div className="doctor-price-info">
                        {doctor.consultation_price_points
                          ? `${doctor.consultation_price_points} pts`
                          : t('Цена уточняется', 'Price on request')}
                        </div>
                      </div>

                      <button
                        className="btn-book-doctor"
                        disabled={!isAvailable}
                        onClick={() => handleBook(doctor.id)}
                      >
                        {isAvailable ? t('Записаться', 'Book now') : t('Недоступен', 'Unavailable')}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </section>
      </div>
    </div>
  );
};

export default DoctorsPage;
