import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { renderIcon } from '../components/Icons';
import api from '../services/api';
import '../App.css';
import './DoctorsPage.css';

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

const specialties = [
  { id: 'all', name: 'Все специалисты' },
  { id: 'therapist', name: 'Терапевт' },
  { id: 'cardiologist', name: 'Кардиолог' },
  { id: 'neurologist', name: 'Невролог' },
  { id: 'dermatologist', name: 'Дерматолог' },
  { id: 'psychologist', name: 'Психолог' },
];

const formatName = (doctor: Doctor) =>
  `${doctor.first_name ?? ''} ${doctor.last_name ?? ''}`.trim() || 'Врач DocLink';

const buildDescription = (doctor: Doctor) => {
  if (doctor.short_description) {
    return doctor.short_description;
  }
  const specialty = doctor.specialty ?? 'Врач';
  if (doctor.experience_years) {
    return `${specialty} с ${doctor.experience_years}+ годами практики.`;
  }
  return `${specialty} DocLink, специализируется на онлайн-консультациях.`;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<Doctor[]>('/doctors/list');
        setDoctors(data);
      } catch (err) {
        setError('Не удалось загрузить список врачей. Попробуйте обновить страницу.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const name = formatName(doctor).toLowerCase();
      const specialty = (doctor.specialty ?? '').toLowerCase();
      const matchSearch =
        name.includes(searchTerm.toLowerCase()) ||
        specialty.includes(searchTerm.toLowerCase());
      const matchSpecialty =
        selectedSpecialty === 'all' ||
        specialty.replace(' ', '_').includes(selectedSpecialty);
      return matchSearch && matchSpecialty;
    });
  }, [doctors, searchTerm, selectedSpecialty]);

  const handleBook = (doctorId: number) => {
    navigate('/schedule', { state: { doctorId } });
  };

  return (
    <div className="doctors-page">
      <Navigation />

      <main className="doctors-main">
        <div className="container">
          {/* Header */}
          <section className="doctors-header">
            <h1>Наши врачи</h1>
            <p className="subtitle">Выберите квалифицированного специалиста для консультации</p>
          </section>

          {/* Filters */}
          <section className="doctors-filters">
            {/* Search */}
            <div className="search-box">
              <div className="search-input-wrapper">
                {renderIcon('search', 20)}
                <input
                  type="text"
                  placeholder="Поиск врача или специальности..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Specialty Filter */}
            <div className="specialty-filter">
              {specialties.map(specialty => (
                <button
                  key={specialty.id}
                  className={`filter-tag ${selectedSpecialty === specialty.id ? 'active' : ''}`}
                  onClick={() => setSelectedSpecialty(specialty.id)}
                >
                  {specialty.name}
                </button>
              ))}
            </div>
          </section>

          {/* Doctors Grid */}
          <section className="doctors-grid">
            {loading && (
              <div className="no-doctors">
                <p>Загружаем команду специалистов…</p>
              </div>
            )}

            {!loading && error && (
              <div className="no-doctors">
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && filteredDoctors.length === 0 && (
              <div className="no-doctors">
                <p>Врачи с такими параметрами пока не найдены.</p>
              </div>
            )}

            {!loading && !error && filteredDoctors.length > 0 && (
              filteredDoctors.map((doctor) => {
                const name = formatName(doctor);
                const description = buildDescription(doctor);
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
                        <p className="doctor-card-specialty">{doctor.specialty ?? 'Специалист DocLink'}</p>
                      </div>

                      <p className="doctor-description">{description}</p>

                      <div className="doctor-footer">
                        <div className="doctor-rating-info">
                          <div className="rating-stars">
                            {renderIcon('star', 16)}
                            <span className="rating-value">{rating}</span>
                          </div>
                          <span className="reviews-count">({reviews} отзывов)</span>
                        </div>
                        <div className="doctor-price-info">
                          {doctor.consultation_price_points
                            ? `${doctor.consultation_price_points} pts`
                            : 'Цена уточняется'}
                        </div>
                      </div>

                      <button
                        className="btn-book-doctor"
                        disabled={!isAvailable}
                        onClick={() => handleBook(doctor.id)}
                      >
                        {isAvailable ? 'Записаться' : 'Недоступен'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default DoctorsPage;
