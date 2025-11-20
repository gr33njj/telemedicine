import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import './LandingPage.css';
import { usePreferences } from '../services/PreferencesContext';
import api from '../services/api';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Interfaces
interface Doctor {
  id: number;
  first_name?: string;
  last_name?: string;
  specialty?: string;
  is_verified: boolean;
  avatar_url?: string;
  rating?: number;
  experience_years?: number;
  consultation_price_points?: number;
}

const SPECIALTIES_RU = [
  'Акушер-гинеколог', 'Аллерголог', 'Гастроэнтеролог', 'Гематолог', 'Дерматолог',
  'Кардиолог', 'Невролог', 'Отоларинголог', 'Педиатр', 'Психотерапевт',
  'Терапевт', 'Уролог', 'Эндокринолог', 'Хирург'
];

const SPECIALTIES_EN = [
  'Ob-Gyn', 'Allergist', 'Gastroenterologist', 'Hematologist', 'Dermatologist',
  'Cardiologist', 'Neurologist', 'ENT', 'Pediatrician', 'Psychotherapist',
  'Therapist', 'Urologist', 'Endocrinologist', 'Surgeon'
];

const REVIEWS = [
  {
    id: 1,
    doctor: 'Кузнецов Иван Спартакович',
    role: 'Педиатр',
    text: 'Хочу выразить благодарность за качественную помощь в лечении и высокий профессионализм.',
    rating: 5
  },
  {
    id: 2,
    doctor: 'Тамбовцева Анна Андреевна',
    role: 'Аллерголог',
    text: 'Спасибо большое, было очень полезно и понятно. Очень радует, когда врач всё объясняет.',
    rating: 5
  },
  {
    id: 3,
    doctor: 'Ерошенко Анна Александровна',
    role: 'Гинеколог',
    text: 'Подробно рассказала, объяснила суть проблемы, дала точные рекомендации.',
    rating: 5
  }
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, language, toggleTheme, toggleLanguage } = usePreferences();
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [activeHeroDoctorIndex, setActiveHeroDoctorIndex] = useState(0);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const t = {
    nav: {
      doctors: language === 'ru' ? 'Врачи' : 'Doctors',
      services: language === 'ru' ? 'Услуги' : 'Services',
      library: language === 'ru' ? 'Библиотека' : 'Library',
      faq: language === 'ru' ? 'Частые вопросы' : 'FAQ',
      login: language === 'ru' ? 'Войти' : 'Sign In'
    },
    hero: {
      title: language === 'ru' ? 'Онлайн-консультации' : 'Online Consultations',
      subtitle: language === 'ru' ? 'Информационное сопровождение' : 'Information Support',
      desc: language === 'ru' 
        ? 'Получите профессиональную медицинскую помощь и информационную поддержку не выходя из дома.'
        : 'Get professional medical help and information support without leaving your home.',
      steps: [
        { num: '1', text: language === 'ru' ? 'Выберите специалиста' : 'Choose a specialist' },
        { num: '2', text: language === 'ru' ? 'Оплатите обращение' : 'Pay for consultation' },
        { num: '3', text: language === 'ru' ? 'Общайтесь в приложении' : 'Chat in the app' }
      ],
      topDoctor: language === 'ru' ? 'Врач дня' : 'Top Doctor'
    },
    promo: {
      title: language === 'ru' ? 'Выбрать врача онлайн' : 'Choose doctor online',
      subtitle: language === 'ru' ? 'Получите консультацию в удобном формате' : 'Get a consultation in a convenient format'
    },
    services: {
      urgent: {
        title: language === 'ru' ? 'Срочное обращение' : 'Urgent Request',
        desc: language === 'ru' ? 'Ответ в течение 60 минут' : 'Response within 60 minutes'
      },
      find: {
        title: language === 'ru' ? 'Найти врача' : 'Find a Doctor',
        desc: language === 'ru' ? 'Быстрый поиск специалистов' : 'Quick search for specialists'
      },
      video: {
        title: language === 'ru' ? 'Видеообращение' : 'Video Consultation',
        desc: language === 'ru' ? 'Профессиональный совет по видео' : 'Professional advice via video'
      },
      library: {
        title: language === 'ru' ? 'Библиотека знаний' : 'Knowledge Library',
        desc: language === 'ru' ? 'Полезные материалы и статьи' : 'Useful materials and articles'
      }
    },
    specialties: language === 'ru' ? 'Специальности' : 'Specialties',
    doctorsList: language === 'ru' ? 'Наши специалисты' : 'Our Specialists',
    bookBtn: language === 'ru' ? 'Записаться' : 'Book',
    reviews: language === 'ru' ? 'Отзывы' : 'Reviews',
    footer: {
      about: language === 'ru' ? 'О нас' : 'About',
      contacts: language === 'ru' ? 'Контакты' : 'Contacts',
      forDoctors: language === 'ru' ? 'Врачу' : 'For Doctors',
      copyright: '© 2024 DocLink'
    }
  };

  // Fetch Doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await api.get<Doctor[]>('/doctors/list');
        // Filter only verified and randomize or sort
        const verified = data.filter(d => d.is_verified);
        setDoctors(verified);
      } catch (err) {
        console.error('Failed to fetch doctors', err);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  // Hero Carousel Logic
  useEffect(() => {
    if (doctors.length === 0) return;
    const interval = setInterval(() => {
      setActiveHeroDoctorIndex(prev => (prev + 1) % Math.min(doctors.length, 5)); // Show top 5 in carousel
    }, 4000);
    return () => clearInterval(interval);
  }, [doctors]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 992) {
        setIsNavOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const heroDoctor = doctors.length > 0 ? doctors[activeHeroDoctorIndex] : null;
  const specialties = language === 'ru' ? SPECIALTIES_RU : SPECIALTIES_EN;

  const formatDoctorName = (d: Doctor) => 
    `${d.first_name || ''} ${d.last_name || ''}`.trim() || (language === 'ru' ? 'Врач' : 'Doctor');

  return (
    <div className="landing-wrapper" data-theme={theme}>
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      <div className="content-wrapper">
        {/* Navbar */}
        <nav className="glass-nav">
          <div className="nav-container">
            <div className="nav-logo">
              <div className="logo-symbol">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span>DocLink</span>
            </div>
            
            <button
              className="nav-toggle"
              aria-label="Toggle navigation"
              onClick={() => setIsNavOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>

            <div className={`nav-links ${isNavOpen ? 'open' : ''}`}>
              <a href="#doctors-list" onClick={() => setIsNavOpen(false)}>
                {t.nav.doctors}
              </a>
              <a href="#services" onClick={() => setIsNavOpen(false)}>
                {t.nav.services}
              </a>
              <a href="#reviews" onClick={() => setIsNavOpen(false)}>
                {t.reviews}
              </a>
              <button
                className="btn-login mobile-only"
                onClick={() => {
                  setIsNavOpen(false);
                  navigate('/login');
                }}
              >
                {t.nav.login}
              </button>
            </div>

            <div className="nav-actions">
              <button className="icon-btn" onClick={toggleLanguage}>
                {language === 'ru' ? 'RU' : 'EN'}
              </button>
              <button className="icon-btn" onClick={toggleTheme}>
                {theme === 'light' ? '☀' : '☾'}
              </button>
              <button className="btn-login" onClick={() => navigate('/login')}>
                {t.nav.login}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section - New Layout */}
        <section className="hero-section-new">
          <div className="container">
            {/* Top: Doctor Carousel Cards */}
            <div className="hero-carousel-top">
              {loadingDoctors ? (
                <div className="doctor-card-mini glass-card">
                  <div className="spinner-small"></div>
                  <p>{language === 'ru' ? 'Загрузка...' : 'Loading...'}</p>
                </div>
              ) : doctors.length > 0 ? (
                doctors.slice(0, 3).map((doctor, idx) => (
                  <div key={doctor.id} className="doctor-card-mini glass-card">
                    <div className="doctor-mini-avatar">
                      {doctor.avatar_url ? (
                        <img src={doctor.avatar_url} alt={formatDoctorName(doctor)} />
                      ) : (
                        <div className="avatar-placeholder-mini">{doctor.first_name?.[0] || '👨‍⚕️'}</div>
                      )}
                    </div>
                    <div className="doctor-mini-info">
                      <h4>{idx === 0 ? `${language === 'ru' ? 'ВРАЧ ДНЯ' : 'TOP DOCTOR'}` : `${language === 'ru' ? 'Врач дня' : 'Doctor'}`}</h4>
                      <p className="doctor-mini-name">{formatDoctorName(doctor)}</p>
                      <p className="doctor-mini-specialty">{doctor.specialty || (language === 'ru' ? 'Карусель' : 'Carousel')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="doctor-card-mini glass-card">
                  <p>{language === 'ru' ? 'Загрузка врачей...' : 'Loading...'}</p>
                </div>
              )}
            </div>

            {/* Bottom: Text Zone + Image */}
            <div className="hero-content-bottom">
              <div className="hero-text-zone">
                <div className="hero-badge">{t.hero.subtitle}</div>
                <h1 className="hero-title">{t.hero.title}</h1>
                <p className="hero-desc">{t.hero.desc}</p>
                
                <div className="hero-steps">
                  {t.hero.steps.map((step, idx) => (
                    <div key={idx} className="hero-step">
                      <div className="step-num">{step.num}</div>
                      <div className="step-text">{step.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hero-image-zone glass-card">
                <DotLottieReact
                  src="https://lottie.host/20f5af9e-95c5-4079-8e6e-4f59403f3cee/14bnTdM49l.lottie"
                  loop
                  autoplay
                />
              </div>
            </div>
          </div>
        </section>

        {/* Transparent Promo Block */}
        <section className="promo-section">
          <div className="container">
            <div className="glass-card promo-card-transparent" onClick={() => navigate('/doctors')}>
              <div className="promo-content">
                <h2>{t.promo.title}</h2>
                <p>{t.promo.subtitle}</p>
              </div>
              <div className="promo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Specialties */}
        <section className="specialties-section">
          <div className="container">
            <h2 className="section-header">{t.specialties}</h2>
            <div className="tags-cloud">
              {specialties.map((spec, idx) => (
                <button key={idx} className="glass-btn tag-btn">
                  {spec}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Doctors List */}
        <section id="doctors-list" className="doctors-list-section">
          <div className="container">
            <h2 className="section-header">{t.doctorsList}</h2>
            <div className="doctors-grid-landing">
              {loadingDoctors ? (
                <p className="loading-text">Loading...</p>
              ) : doctors.length > 0 ? (
                doctors.slice(0, 8).map(doctor => (
                  <div key={doctor.id} className="glass-card doctor-card-mini">
                    <div className="doctor-mini-header">
                      {doctor.avatar_url ? (
                        <img src={doctor.avatar_url} className="doctor-mini-avatar" alt="avatar" />
                      ) : (
                        <div className="doctor-mini-avatar placeholder">{doctor.first_name?.[0]}</div>
                      )}
                      <div className="doctor-mini-info">
                         <h4>{formatDoctorName(doctor)}</h4>
                         <span>{doctor.specialty}</span>
                         <div className="mini-rating">★ {doctor.rating || 5.0}</div>
                      </div>
                    </div>
                    <button className="btn-book-mini" onClick={() => navigate('/doctors')}>
                      {t.bookBtn}
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-text">No doctors available</p>
              )}
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section id="services" className="services-section">
          <div className="container services-grid">
            <div className="glass-card service-card card-teal">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3>{t.services.urgent.title}</h3>
              <p>{t.services.urgent.desc}</p>
            </div>

            <div className="glass-card service-card card-blue">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <h3>{t.services.find.title}</h3>
              <p>{t.services.find.desc}</p>
            </div>

            <div className="glass-card service-card card-purple">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </div>
              <h3>{t.services.video.title}</h3>
              <p>{t.services.video.desc}</p>
            </div>

            <div className="glass-card service-card card-cyan">
               <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <h3>{t.services.library.title}</h3>
              <p>{t.services.library.desc}</p>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section id="reviews" className="reviews-section">
          <div className="container">
            <h2 className="section-header">{t.reviews}</h2>
            <div className="reviews-grid">
              {REVIEWS.map(review => (
                <div key={review.id} className="glass-card review-card">
                  <div className="review-header">
                    <div className="review-avatar">{review.doctor[0]}</div>
                    <div>
                      <div className="review-author">{review.doctor}</div>
                      <div className="review-role">{review.role}</div>
                    </div>
                  </div>
                  <p className="review-text">"{review.text}"</p>
                  <div className="review-rating">{'★'.repeat(review.rating)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Footer - outside content wrapper to stick bottom properly */}
      <footer className="glass-footer">
        <div className="footer-wrapper">
          <div className="footer-main">
            <div className="footer-brand">
              <div className="footer-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span>DocLink</span>
              </div>
              <p className="footer-tagline">
                {language === 'ru' ? 'Современная телемедицина' : 'Modern Telemedicine'}
              </p>
            </div>
            
            <div className="footer-nav">
              <div className="footer-column">
                <h5>{language === 'ru' ? 'Пациентам' : 'For Patients'}</h5>
                <a href="#doctors">{language === 'ru' ? 'Найти врача' : 'Find Doctor'}</a>
                <a href="#services">{language === 'ru' ? 'Услуги' : 'Services'}</a>
                <a href="#prices">{language === 'ru' ? 'Цены' : 'Pricing'}</a>
              </div>
              
              <div className="footer-column">
                <h5>{language === 'ru' ? 'Врачам' : 'For Doctors'}</h5>
                <a href="#join">{language === 'ru' ? 'Присоединиться' : 'Join Us'}</a>
                <a href="#schedule">{language === 'ru' ? 'Расписание' : 'Schedule'}</a>
                <a href="#support">{language === 'ru' ? 'Поддержка' : 'Support'}</a>
              </div>
              
              <div className="footer-column">
                <h5>{language === 'ru' ? 'Компания' : 'Company'}</h5>
                <a href="#about">{t.footer.about}</a>
                <a href="#contacts">{t.footer.contacts}</a>
                <a href="#privacy">{language === 'ru' ? 'Конфиденциальность' : 'Privacy'}</a>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>{t.footer.copyright}</p>
            <div className="footer-social">
              <span>{language === 'ru' ? 'Мы в соцсетях:' : 'Follow us:'}</span>
              {/* Add social icons here if needed */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
