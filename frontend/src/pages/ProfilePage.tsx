import React, { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import { renderIcon } from '../components/Icons';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';
import { usePreferences } from '../services/PreferencesContext';
import '../App.css';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { language } = usePreferences();
  const isEnglish = language === 'en';
  const t = (ru: string, en: string) => (isEnglish ? en : ru);

  const [isEditing, setIsEditing] = useState(false);
  const [showEMK, setShowEMK] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    specialty: '',
    experienceYears: '',
    consultationPrice: '',
    shortDescription: '',
    bio: '',
    avatarUrl: '',
  });
  const [formData, setFormData] = useState(profileData);
  const [doctorStatus, setDoctorStatus] = useState<{ isVerified: boolean; status: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileData((prev) => ({ ...prev, email: user.email ?? '' }));
    setFormData((prev) => ({ ...prev, email: user.email ?? '' }));
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'doctor') return;
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const { data } = await api.get('/doctors/profile');
        const mapped = {
          firstName: data.first_name ?? '',
          lastName: data.last_name ?? '',
          middleName: data.middle_name ?? '',
          email: user.email ?? '',
          specialty: data.specialty ?? '',
          experienceYears: data.experience_years?.toString() ?? '',
          consultationPrice: data.consultation_price_points?.toString() ?? '',
          shortDescription: data.short_description ?? '',
          bio: data.bio ?? '',
          avatarUrl: data.avatar_url ?? '',
        };
        setProfileData(mapped);
        setFormData(mapped);
        setDoctorStatus({
          isVerified: data.is_verified,
          status: data.verification_status,
        });
      } catch (error) {
        console.error('Failed to load doctor profile', error);
        setProfileError(t('Не удалось загрузить профиль врача', 'Failed to load doctor profile'));
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [user, t]);

  const emkDocuments = [
    {
      id: 1,
      date: '2024-01-15',
      doctor: 'Dr. Иван Сидоров',
      type: 'Заключение',
      file: 'conclusion_2024_01_15.pdf',
      size: '245 KB',
    },
    {
      id: 2,
      date: '2024-01-10',
      doctor: 'Dr. Мария Петрова',
      type: 'Результаты анализов',
      file: 'analysis_2024_01_10.pdf',
      size: '512 KB',
    },
    {
      id: 3,
      date: '2024-01-05',
      doctor: 'Dr. Алексей Иванов',
      type: 'Рекомендации',
      file: 'recommendations_2024_01_05.pdf',
      size: '128 KB',
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user || user.role !== 'doctor') {
      setProfileData(formData);
      setIsEditing(false);
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      const payload = {
        first_name: formData.firstName || undefined,
        last_name: formData.lastName || undefined,
        middle_name: formData.middleName || undefined,
        specialty: formData.specialty || undefined,
        experience_years: formData.experienceYears ? Number(formData.experienceYears) : undefined,
        consultation_price_points: formData.consultationPrice ? Number(formData.consultationPrice) : undefined,
        short_description: formData.shortDescription || undefined,
        bio: formData.bio || undefined,
        avatar_url: formData.avatarUrl || undefined,
      };
      await api.put('/doctors/profile', payload);
      setProfileData(formData);
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to save doctor profile', error);
      const detail = error?.response?.data?.detail;
      setProfileError(
        typeof detail === 'string'
          ? detail
          : t('Не удалось сохранить профиль врача', 'Failed to save doctor profile'),
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const medicalRecords = [
    { id: 1, date: '2024-01-15', doctor: 'Dr. Smith', diagnosis: 'Консультация', notes: 'Общее состояние в норме' },
    { id: 2, date: '2024-01-10', doctor: 'Dr. Johnson', diagnosis: 'Осмотр', notes: 'Рекомендации: режим сна' },
  ];

  return (
    <div className="profile-page">
      <Navigation />

      <main className="profile-main">
        <div className="container">
          {/* Profile Header */}
          <section className="profile-header">
            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar">
                  {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                </div>
                <div className="avatar-actions">
                  <label className="btn-upload">
                    {renderIcon('upload', 16)}
                    <input type="file" accept="image/*" style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div className="profile-info">
                <h1>
                  {profileData.firstName || t('Имя', 'First')} {profileData.lastName || t('Фамилия', 'Last')}
                </h1>
                <p className="profile-email">{profileData.email}</p>
                {doctorStatus && (
                  <span
                    className={`doctor-status-badge ${
                      doctorStatus.isVerified ? 'status-approved' : 'status-pending'
                    }`}
                  >
                    {doctorStatus.isVerified
                      ? t('Опубликован', 'Published')
                      : doctorStatus.status === 'pending'
                        ? t('На модерации', 'Awaiting moderation')
                        : t('Черновик', 'Draft')}
                  </span>
                )}
              </div>

              {user?.role === 'doctor' && !isEditing && (
                <button className="btn-edit" onClick={() => setIsEditing(true)}>
                  {renderIcon('edit', 16)}
                {t('Редактировать', 'Edit')}
                </button>
              )}
            </div>
          </section>

          {/* Edit Profile Section */}
          {isEditing && (
            <section className="edit-profile-section">
              <h2>{t('Редактировать профиль врача', 'Edit doctor profile')}</h2>
              {profileLoading && <div className="profile-loading">{t('Загружаем профиль…', 'Loading profile…')}</div>}
              {!profileLoading && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>{t('Имя', 'First name')}</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder={t('Имя', 'First name')}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Фамилия', 'Last name')}</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder={t('Фамилия', 'Last name')}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Отчество', 'Middle name')}</label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      placeholder={t('Отчество', 'Middle name')}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Специальность', 'Specialty')}</label>
                    <input
                      type="text"
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleInputChange}
                      placeholder={t('Специальность', 'Specialty')}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Опыт (лет)', 'Experience (years)')}</label>
                    <input
                      type="number"
                      name="experienceYears"
                      value={formData.experienceYears}
                      onChange={handleInputChange}
                      placeholder="10"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Стоимость консультации (pts)', 'Consultation price (pts)')}</label>
                    <input
                      type="number"
                      name="consultationPrice"
                      value={formData.consultationPrice}
                      onChange={handleInputChange}
                      placeholder="250"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Короткое описание', 'Short description')}</label>
                    <input
                      type="text"
                      name="shortDescription"
                      value={formData.shortDescription}
                      onChange={handleInputChange}
                      placeholder={t('Например: онлайн терапевт', 'Example: online therapist')}
                    />
                  </div>
                  <div className="form-group form-group-wide">
                    <label>{t('Развёрнутое описание', 'Detailed bio')}</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder={t('Опишите опыт, подход и т.д.', 'Describe your experience, approach, etc.')}
                    />
                  </div>
                  <div className="form-group">
                    <label>Avatar URL</label>
                    <input
                      type="url"
                      name="avatarUrl"
                      value={formData.avatarUrl}
                      onChange={handleInputChange}
                      placeholder="https://"
                    />
                  </div>
                </div>
              )}
              {profileError && <div className="profile-error">{profileError}</div>}
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setIsEditing(false)}>
                  {t('Отменить', 'Cancel')}
                </button>
                <button className="btn-save" onClick={handleSave} disabled={savingProfile}>
                  {savingProfile ? t('Сохраняем…', 'Saving…') : t('Сохранить', 'Save')}
                </button>
              </div>
            </section>
          )}

          {/* Medical Records */}
          <section className="medical-records-section">
            <h2>{t('История консультаций', 'Consultation history')}</h2>
            <div className="records-list">
              {medicalRecords.map(record => (
                <div key={record.id} className="record-item">
                  <div className="record-icon">
                    {renderIcon('document', 20)}
                  </div>
                  <div className="record-details">
                    <div className="record-header">
                      <h3>{record.diagnosis}</h3>
                      <span className="record-date">{record.date}</span>
                    </div>
                    <p className="record-doctor">
                      {t('Врач', 'Doctor')}: {record.doctor}
                    </p>
                    <p className="record-notes">{record.notes}</p>
                  </div>
                  <button className="btn-view" title={t('Просмотр', 'View')}>
                    {renderIcon('arrow-right', 20)}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* EMK Section */}
          <section className="emk-section">
            <div className="emk-header">
              <h2>{t('Электронная медицинская карта (ЭМК)', 'Electronic medical record')}</h2>
              <button 
                className="btn-open-emk"
                onClick={() => setShowEMK(true)}
              >
                {renderIcon('folder', 16)} {t('Открыть карту', 'Open record')}
              </button>
            </div>
            <p className="emk-description">
              {t(
                'Все документы и заключения из консультаций с врачами хранятся в защищённой медицинской карте',
                'All consultation documents are stored securely in your medical record',
              )}
            </p>
          </section>

          {/* EMK Modal */}
          {showEMK && (
            <>
              <div className="emk-modal-overlay" onClick={() => setShowEMK(false)}></div>
              <div className="emk-modal">
                <div className="emk-modal-header">
                  <h2>{t('Электронная медицинская карта', 'Electronic medical record')}</h2>
                  <button 
                    className="emk-modal-close"
                    onClick={() => setShowEMK(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="emk-modal-body">
                  <div className="emk-upload-section">
                    <label className="upload-area">
                      <div className="upload-content">
                        {renderIcon('upload', 24)}
                        <p>{t('Загрузить документ', 'Upload document')}</p>
                        <span>{t('Перетащите файл или нажмите для выбора', 'Drag or click to select a file')}</span>
                      </div>
                      <input type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.png" />
                    </label>
                  </div>

                  <div className="emk-documents">
                    <h3>{t('Ваши документы', 'Your documents')}</h3>
                    <div className="documents-list">
                      {emkDocuments.map(doc => (
                        <div key={doc.id} className="document-item">
                          <div className="doc-icon">
                            {renderIcon('document', 20)}
                          </div>
                          <div className="doc-info">
                            <div className="doc-header">
                              <h4>{doc.type}</h4>
                              <span className="doc-date">{doc.date}</span>
                            </div>
                            <p className="doc-doctor">{doc.doctor}</p>
                            <p className="doc-file">{doc.file} • {doc.size}</p>
                          </div>
                          <div className="doc-actions">
                            <button className="doc-btn doc-view" title={t('Просмотр', 'View')}>
                              {renderIcon('eye', 16)}
                            </button>
                            <button className="doc-btn doc-download" title={t('Скачать', 'Download')}>
                              {renderIcon('download', 16)}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Profile Stats */}
          <section className="profile-stats">
            <div className="stat-card">
              <div className="stat-icon">{renderIcon('check-circle', 24)}</div>
            <div className="stat-content">
              <div className="stat-value">12</div>
              <div className="stat-label">{t('Завершённых консультаций', 'Completed consultations')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">{renderIcon('star', 24)}</div>
              <div className="stat-content">
                <div className="stat-value">4.8</div>
              <div className="stat-label">{t('Средний рейтинг врачей', 'Average doctor rating')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">{renderIcon('calendar', 24)}</div>
              <div className="stat-content">
                <div className="stat-value">2</div>
              <div className="stat-label">{t('Предстоящие консультации', 'Upcoming consultations')}</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
