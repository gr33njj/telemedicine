import React, { useEffect, useMemo, useState } from 'react';
import Navigation from '../components/Navigation';
import { renderIcon } from '../components/Icons';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';
import { usePreferences } from '../services/PreferencesContext';
import '../App.css';
import './ProfilePage.css';

interface ConsultationHistoryItem {
  id: number;
  doctor_name?: string;
  patient_name?: string;
  status: string;
  slot_start_time?: string;
  slot_end_time?: string;
  points_cost: number;
  doctor_specialty?: string;
}

interface MedicalFileItem {
  id: number;
  file_name: string;
  file_type?: string;
  description?: string;
  uploaded_at: string;
}

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
    dateOfBirth: '',
    gender: '',
    phone: '',
  });
  const [formData, setFormData] = useState(profileData);
  const [doctorStatus, setDoctorStatus] = useState<{ isVerified: boolean; status: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [consultationHistory, setConsultationHistory] = useState<ConsultationHistoryItem[]>([]);
  const [medicalFiles, setMedicalFiles] = useState<MedicalFileItem[]>([]);
  const [medicalFilesLoading, setMedicalFilesLoading] = useState(false);
  const [medicalFilesError, setMedicalFilesError] = useState<string | null>(null);
  const [uploadingMedicalFile, setUploadingMedicalFile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';

  useEffect(() => {
    if (!user) return;
    setProfileData((prev) => ({ ...prev, email: user.email ?? '' }));
    setFormData((prev) => ({ ...prev, email: user.email ?? '' }));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        if (isDoctor) {
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
            dateOfBirth: '',
            gender: '',
            phone: '',
          };
          setProfileData(mapped);
          setFormData(mapped);
          setDoctorStatus({
            isVerified: data.is_verified,
            status: data.verification_status,
          });
        } else {
          const { data } = await api.get('/users/profile');
          const mapped = {
            firstName: data.first_name ?? '',
            lastName: data.last_name ?? '',
            middleName: data.middle_name ?? '',
            email: user.email ?? '',
            specialty: '',
            experienceYears: '',
            consultationPrice: '',
            shortDescription: '',
            bio: '',
            avatarUrl: '',
            dateOfBirth: data.date_of_birth ? data.date_of_birth.substring(0, 10) : '',
            gender: data.gender ?? '',
            phone: data.phone ?? '',
          };
          setProfileData(mapped);
          setFormData(mapped);
        }
      } catch (error) {
        console.error('Failed to load profile', error);
        setProfileError(t('Не удалось загрузить профиль', 'Failed to load profile'));
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [user, t, isDoctor]);

  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const { data } = await api.get<ConsultationHistoryItem[]>('/consultations/history', {
          params: { limit: 50 },
        });
        setConsultationHistory(data);
      } catch (error) {
        console.error('Failed to load consultation history', error);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [user]);

  useEffect(() => {
    if (showEMK && isPatient) {
      fetchMedicalFiles();
    }
  }, [showEMK, isPatient]);

  useEffect(() => {
    if (isPatient) {
      fetchMedicalFiles();
    }
  }, [isPatient]);

  const fetchMedicalFiles = async () => {
    if (!isPatient) {
      setMedicalFiles([]);
      return;
    }
    try {
      setMedicalFilesLoading(true);
      setMedicalFilesError(null);
      const { data } = await api.get<MedicalFileItem[]>('/users/medical-files');
      setMedicalFiles(data);
    } catch (error) {
      console.error('Failed to load medical files', error);
      setMedicalFilesError(t('Не удалось загрузить документы', 'Failed to load documents'));
    } finally {
      setMedicalFilesLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSavingProfile(true);
    setProfileError(null);
    try {
      if (isDoctor) {
        const payload = {
          first_name: formData.firstName || undefined,
          last_name: formData.lastName || undefined,
          middle_name: formData.middleName || undefined,
          specialty: formData.specialty || undefined,
          experience_years: formData.experienceYears ? Number(formData.experienceYears) : undefined,
          consultation_price_points: formData.consultationPrice ? Number(formData.consultationPrice) : undefined,
          short_description: formData.shortDescription || undefined,
          bio: formData.bio || undefined,
        };
        const { data } = await api.put('/doctors/profile', payload);
        const synced = {
          firstName: data.first_name ?? '',
          lastName: data.last_name ?? '',
          middleName: data.middle_name ?? '',
          email: user?.email ?? '',
          specialty: data.specialty ?? '',
          experienceYears: data.experience_years?.toString() ?? '',
          consultationPrice: data.consultation_price_points?.toString() ?? '',
          shortDescription: data.short_description ?? '',
          bio: data.bio ?? '',
          avatarUrl: data.avatar_url ?? '',
          dateOfBirth: '',
          gender: '',
          phone: '',
        };
        setProfileData(synced);
        setFormData(synced);
      } else {
        const payload = {
          first_name: formData.firstName || undefined,
          last_name: formData.lastName || undefined,
          middle_name: formData.middleName || undefined,
          gender: formData.gender || undefined,
          phone: formData.phone || undefined,
          date_of_birth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
        };
        await api.put('/users/profile', payload);
        setProfileData(formData);
      }
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

  const handleMedicalFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setUploadingMedicalFile(true);
    try {
      const formDataPayload = new FormData();
      formDataPayload.append('file', file);
      formDataPayload.append('description', file.name);
      await api.post('/users/medical-files/upload', formDataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchMedicalFiles();
    } catch (error) {
      console.error('Failed to upload medical file', error);
      setMedicalFilesError(t('Не удалось загрузить документ', 'Failed to upload document'));
    } finally {
      setUploadingMedicalFile(false);
      event.target.value = '';
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !isDoctor) return;
    const file = event.target.files[0];
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/doctors/profile/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormData((prev) => ({ ...prev, avatarUrl: data.avatar_url }));
      setProfileData((prev) => ({ ...prev, avatarUrl: data.avatar_url }));
    } catch (error) {
      console.error('Failed to upload avatar', error);
      setProfileError(t('Не удалось загрузить фото', 'Failed to upload photo'));
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

  const downloadMedicalFile = async (fileId: number, fileName?: string) => {
    try {
      const response = await api.get(`/users/medical-files/${fileId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download medical file', error);
      setMedicalFilesError(t('Не удалось скачать документ', 'Failed to download document'));
    }
  };

  const consultationHistorySorted = useMemo(
    () =>
      [...consultationHistory].sort((a, b) => {
        const aDate = a.slot_start_time ? new Date(a.slot_start_time).getTime() : 0;
        const bDate = b.slot_start_time ? new Date(b.slot_start_time).getTime() : 0;
        return bDate - aDate;
      }),
    [consultationHistory],
  );

  const historyEmpty = !historyLoading && consultationHistorySorted.length === 0;

  const displayName = useMemo(() => {
    const parts = [profileData.firstName, profileData.middleName, profileData.lastName].filter(
      (p) => p && p.trim().length,
    );
    if (parts.length) {
      return parts.join(' ');
    }
    return profileData.email || '';
  }, [profileData]);

  const initials = useMemo(() => {
    const first = profileData.firstName?.trim();
    const last = profileData.lastName?.trim();
    if (first || last) {
      return `${first?.charAt(0) ?? ''}${last?.charAt(0) ?? ''}`.toUpperCase() || '?';
    }
    return profileData.email?.charAt(0).toUpperCase() ?? '?';
  }, [profileData]);

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString(isEnglish ? 'en-US' : 'ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString(isEnglish ? 'en-US' : 'ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDoctorForm = () => (
    <div className="form-grid">
      <div className="form-group">
        <label>{t('Имя', 'First name')}</label>
        <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>{t('Фамилия', 'Last name')}</label>
        <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>{t('Отчество', 'Middle name')}</label>
        <input type="text" name="middleName" value={formData.middleName} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>{t('Специальность', 'Specialty')}</label>
        <input type="text" name="specialty" value={formData.specialty} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>{t('Опыт (лет)', 'Experience (years)')}</label>
        <input type="number" name="experienceYears" value={formData.experienceYears} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>{t('Стоимость консультации (pts)', 'Consultation price (pts)')}</label>
        <input type="number" name="consultationPrice" value={formData.consultationPrice} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>{t('Короткое описание', 'Short description')}</label>
        <input type="text" name="shortDescription" value={formData.shortDescription} onChange={handleInputChange} />
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
    </div>
  );

  const renderPatientForm = () => (
    <div className="form-grid">
      <div className="form-group">
        <label>{t('Имя', 'First name')}</label>
        <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>{t('Фамилия', 'Last name')}</label>
        <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>{t('Отчество', 'Middle name')}</label>
        <input type="text" name="middleName" value={formData.middleName} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>{t('Дата рождения', 'Date of birth')}</label>
        <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>{t('Пол', 'Gender')}</label>
        <select name="gender" value={formData.gender} onChange={handleInputChange}>
          <option value="">{t('Не указано', 'Not specified')}</option>
          <option value="female">{t('Женский', 'Female')}</option>
          <option value="male">{t('Мужской', 'Male')}</option>
        </select>
      </div>
      <div className="form-group">
        <label>{t('Телефон', 'Phone')}</label>
        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} />
      </div>
    </div>
  );

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
                  {profileData.avatarUrl ? (
                    <img src={profileData.avatarUrl} alt={displayName} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                {isDoctor && (
                  <div className="avatar-actions">
                    <label className="btn-upload">
                      {renderIcon('upload', 16)}
                      <span>{avatarUploading ? t('Загружаем…', 'Uploading…') : t('Обновить фото', 'Update photo')}</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                    </label>
                  </div>
                )}
              </div>

              <div className="profile-info">
                <h1>{displayName || t('Профиль пользователя', 'User profile')}</h1>
                <p className="profile-email">{profileData.email}</p>
                <div className="profile-meta">
                  {profileData.specialty && <span>{profileData.specialty}</span>}
                  {profileData.dateOfBirth && (
                    <span>
                      {t('День рождения', 'Birthday')}: {formatDate(profileData.dateOfBirth)}
                    </span>
                  )}
                  {profileData.phone && (
                    <span>
                      {t('Телефон', 'Phone')}: {profileData.phone}
                    </span>
                  )}
                </div>
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

              {user && !isEditing && (
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
              <h2>
                {isDoctor
                  ? t('Редактировать профиль врача', 'Edit doctor profile')
                  : t('Редактировать профиль', 'Edit profile')}
              </h2>
              {profileLoading && <div className="profile-loading">{t('Загружаем профиль…', 'Loading profile…')}</div>}
              {!profileLoading && (
                <>
                  {isDoctor ? renderDoctorForm() : renderPatientForm()}
                </>
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
            {historyLoading && <div className="profile-loading">{t('Загружаем историю…', 'Loading history…')}</div>}
            {!historyLoading && historyEmpty && (
              <div className="records-empty">{t('Пока нет консультаций', 'No consultations yet')}</div>
            )}
            {!historyLoading && !historyEmpty && (
              <div className="records-list">
                {consultationHistorySorted.map((record) => {
                  const counterpart = isDoctor
                    ? record.patient_name || t('Пациент', 'Patient')
                    : record.doctor_name || t('Врач DocLink', 'DocLink doctor');
                  const slotTime = record.slot_start_time ? new Date(record.slot_start_time) : null;
                  const slotEnd = record.slot_end_time ? new Date(record.slot_end_time) : null;
                  const timeLabel = slotTime
                    ? `${slotTime.toLocaleDateString(isEnglish ? 'en-US' : 'ru-RU', {
                        day: '2-digit',
                        month: 'short',
                      })}, ${slotTime.toLocaleTimeString(isEnglish ? 'en-US' : 'ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}${
                        slotEnd
                          ? ` — ${slotEnd.toLocaleTimeString(isEnglish ? 'en-US' : 'ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`
                          : ''
                      }`
                    : t('Без расписания', 'No slot');

                  return (
                    <div key={record.id} className="record-item">
                      <div className="record-icon">{renderIcon('calendar', 20)}</div>
                      <div className="record-details">
                        <div className="record-header">
                          <h3>{counterpart}</h3>
                          <span className="record-date">{timeLabel}</span>
                        </div>
                        <p className="record-doctor">
                          {t('Статус', 'Status')}: {record.status}
                        </p>
                        {record.doctor_specialty && !isDoctor && (
                          <p className="record-notes">
                            {t('Специальность', 'Specialty')}: {record.doctor_specialty}
                          </p>
                        )}
                      </div>
                      <div className="record-cost">
                        <span>{record.points_cost} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* EMK Section */}
          <section className="emk-section">
            <div className="emk-header">
              <h2>{t('Электронная медицинская карта (ЭМК)', 'Electronic medical record')}</h2>
              <button className="btn-open-emk" onClick={() => setShowEMK(true)}>
                {renderIcon('folder', 16)} {t('Открыть карту', 'Open record')}
              </button>
            </div>
            <p className="emk-description">
              {t(
                'Все документы и заключения из консультаций с врачами хранятся в защищённой медицинской карте',
                'All consultation documents are stored securely in your medical record',
              )}
            </p>
            {isPatient && medicalFiles.length > 0 && (
              <p className="emk-counter">
                {t('Загружено документов', 'Documents uploaded')}: {medicalFiles.length}
              </p>
            )}
          </section>

          {/* EMK Modal */}
          {showEMK && (
            <>
              <div className="emk-modal-overlay" onClick={() => setShowEMK(false)}></div>
              <div className="emk-modal">
                <div className="emk-modal-header">
                  <h2>{t('Электронная медицинская карта', 'Electronic medical record')}</h2>
                  <button className="emk-modal-close" onClick={() => setShowEMK(false)}>
                    ✕
                  </button>
                </div>

                <div className="emk-modal-body">
                  {isPatient ? (
                    <div className="emk-upload-section">
                      <label className="upload-area">
                        <div className="upload-content">
                          {renderIcon('upload', 24)}
                          <p>{t('Загрузить документ', 'Upload document')}</p>
                          <span>{t('Перетащите файл или нажмите для выбора', 'Drag or click to select a file')}</span>
                        </div>
                        <input
                          type="file"
                          style={{ display: 'none' }}
                          accept=".pdf,.doc,.docx,.jpg,.png"
                          onChange={handleMedicalFileUpload}
                        />
                      </label>
                      {uploadingMedicalFile && <div className="upload-hint">{t('Загружаем…', 'Uploading…')}</div>}
                    </div>
                  ) : (
                    <p className="emk-description">
                      {t('Загрузка доступна пациентам', 'Uploading is available for patients only')}
                    </p>
                  )}

                  <div className="emk-documents">
                    <h3>{t('Ваши документы', 'Your documents')}</h3>
                    {medicalFilesLoading && (
                      <div className="documents-list">
                        <div className="documents-empty">{t('Загружаем документы…', 'Loading documents…')}</div>
                      </div>
                    )}
                    {medicalFilesError && <div className="documents-empty">{medicalFilesError}</div>}
                    {!medicalFilesLoading && !medicalFilesError && medicalFiles.length === 0 && (
                      <div className="documents-empty">
                        {t('Документы пока не добавлены', 'No documents yet')}
                      </div>
                    )}
                    {!medicalFilesLoading && medicalFiles.length > 0 && (
                      <div className="documents-list">
                        {medicalFiles.map((doc) => (
                          <div key={doc.id} className="document-item">
                            <div className="doc-icon">{renderIcon('document', 20)}</div>
                            <div className="doc-info">
                              <div className="doc-header">
                                <h4>{doc.description || doc.file_name}</h4>
                                <span className="doc-date">{formatDateTime(doc.uploaded_at)}</span>
                              </div>
                              <p className="doc-file">
                                {doc.file_name} • {doc.file_type || 'file'}
                              </p>
                            </div>
                            <div className="doc-actions">
                              <button className="doc-action" onClick={() => downloadMedicalFile(doc.id, doc.file_name)}>
                                {renderIcon('download', 16)} {t('Скачать', 'Download')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
