import React, { useEffect, useMemo, useState } from 'react';
import Navigation from '../components/Navigation';
import api from '../services/api';
import '../App.css';
import './AdminPage.css';

type AdminTab = 'overview' | 'users' | 'doctors' | 'consultations' | 'transactions';

interface AdminStats {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  total_consultations: number;
  total_revenue_points: number;
  active_doctors: number;
}

interface AdminUser {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string;
  full_name?: string;
  wallet_balance?: number;
}

interface AdminDoctor {
  id: number;
  user_id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  specialty?: string;
  experience_years?: number;
  created_at?: string;
  short_description?: string;
  avatar_url?: string;
  rating?: number;
  reviews_count?: number;
  consultation_price_points?: number;
  is_verified?: boolean;
}

interface AdminConsultation {
  id: number;
  status: string;
  points_cost: number;
  patient_name?: string;
  patient_email?: string;
  doctor_name?: string;
  doctor_email?: string;
  slot_start_time?: string;
  slot_end_time?: string;
  created_at: string;
}

interface AdminTransaction {
  id: number;
  wallet_id: number;
  transaction_type: string;
  amount: number;
  balance_before?: number;
  balance_after?: number;
  description?: string;
  related_consultation_id?: number;
  created_at?: string;
}

interface AdminDoctorProfile extends AdminDoctor {
  middle_name?: string;
  bio?: string;
  verification_status: string;
}

interface SlotDraft {
  start_time: string;
  end_time: string;
  label: string;
}

interface AdminScheduleSlot {
  id: number;
  doctor_id: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_reserved: boolean;
}

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'patient' | 'doctor' | 'admin'>('all');

  const [pendingDoctors, setPendingDoctors] = useState<AdminDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorProfiles, setDoctorProfiles] = useState<AdminDoctorProfile[]>([]);
  const [doctorProfilesLoading, setDoctorProfilesLoading] = useState(false);

  const [consultations, setConsultations] = useState<AdminConsultation[]>([]);
  const [consultationStatus, setConsultationStatus] = useState<'all' | 'created' | 'active' | 'completed' | 'cancelled'>('all');
  const [consultationsLoading, setConsultationsLoading] = useState(false);

  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [topUpForm, setTopUpForm] = useState({
    email: '',
    amount: '',
    description: '',
  });
  const [topUpLoading, setTopUpLoading] = useState(false);

  const [banner, setBanner] = useState<string | null>(null);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultationForm, setConsultationForm] = useState({
    patient: '',
    doctor: '',
    date: '',
    time: '',
    duration: 30,
    points: 100,
  });
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<AdminDoctorProfile | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedScheduleDoctor, setSelectedScheduleDoctor] = useState<AdminDoctorProfile | null>(null);
  const [doctorForm, setDoctorForm] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    specialty: '',
    experience_years: '',
    consultation_price_points: '',
    short_description: '',
    bio: '',
    avatar_url: '',
    rating: '',
    reviews_count: '',
    verification_status: 'approved',
  });
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [slotDrafts, setSlotDrafts] = useState<SlotDraft[]>([]);
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [slotDuration, setSlotDuration] = useState(30);
  const [creatingSlots, setCreatingSlots] = useState(false);
  const [existingSlots, setExistingSlots] = useState<AdminScheduleSlot[]>([]);
  const [existingSlotsLoading, setExistingSlotsLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, roleFilter]);

  useEffect(() => {
    if (activeTab === 'doctors') {
      fetchPendingDoctors();
      fetchDoctorProfiles();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'consultations') {
      fetchConsultations();
    }
  }, [activeTab, consultationStatus]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const params = roleFilter === 'all' ? {} : { role: roleFilter };
      const { data } = await api.get('/admin/users', { params });
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users', error);
      setUsersError('Не удалось загрузить пользователей');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPendingDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const { data } = await api.get('/admin/doctors/pending');
      setPendingDoctors(data);
    } catch (error) {
      console.error('Failed to load doctors', error);
      setBanner('Не удалось загрузить список врачей');
    } finally {
      setDoctorsLoading(false);
    }
  };

  const fetchDoctorProfiles = async () => {
    setDoctorProfilesLoading(true);
    try {
      const { data } = await api.get('/admin/doctors');
      setDoctorProfiles(data);
    } catch (error) {
      console.error('Failed to load doctor profiles', error);
      setBanner('Не удалось загрузить профили врачей');
    } finally {
      setDoctorProfilesLoading(false);
    }
  };

  const fetchDoctorSlots = async (doctorId: number) => {
    setExistingSlotsLoading(true);
    try {
      const { data } = await api.get(`/admin/doctors/${doctorId}/slots`);
      setExistingSlots(data);
    } catch (error) {
      console.error('Failed to load doctor slots', error);
      setExistingSlots([]);
      setBanner('Не удалось загрузить расписание врача');
    } finally {
      setExistingSlotsLoading(false);
    }
  };

  const fetchConsultations = async () => {
    setConsultationsLoading(true);
    try {
      const params = consultationStatus === 'all' ? {} : { status: consultationStatus };
      const { data } = await api.get('/admin/consultations', { params });
      setConsultations(data);
    } catch (error) {
      console.error('Failed to load consultations', error);
      setBanner('Не удалось загрузить консультации');
    } finally {
      setConsultationsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const { data } = await api.get('/admin/transactions', { params: { limit: 20 } });
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions', error);
      setBanner('Не удалось загрузить транзакции');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const name = user.full_name?.toLowerCase() || '';
      return name.includes(query) || user.email.toLowerCase().includes(query);
    });
  }, [users, searchQuery]);

  const handleUserRoleChange = async (userId: number, role: string) => {
    try {
      await api.patch(`/admin/users/${userId}`, { role });
      setBanner('Роль пользователя обновлена');
      fetchUsers();
    } catch (error) {
      console.error('Failed to update role', error);
      setBanner('Не удалось изменить роль');
    }
  };

  const handleToggleUser = async (userId: number, isActive: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { is_active: isActive });
      setBanner(isActive ? 'Пользователь активирован' : 'Пользователь заблокирован');
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user', error);
      setBanner('Не удалось обновить статус пользователя');
    }
  };

  const handleDoctorDecision = async (doctorId: number, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/admin/doctors/${doctorId}/verify`, { verification_status: status });
      fetchPendingDoctors();
      setBanner(status === 'approved' ? 'Врач одобрен' : 'Заявка отклонена');
    } catch (error) {
      console.error('Failed to verify doctor', error);
      setBanner('Не удалось обновить статус врача');
    }
  };

  const handleConsultationAction = async (consultationId: number, action: 'completed' | 'cancelled') => {
    try {
      await api.patch(`/admin/consultations/${consultationId}`, { status: action });
      fetchConsultations();
      setBanner(action === 'completed' ? 'Консультация завершена' : 'Консультация отменена');
    } catch (error) {
      console.error('Failed to update consultation', error);
      setBanner('Не удалось обновить консультацию');
    }
  };

  const handleManualTopUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!topUpForm.email || !topUpForm.amount) {
      setBanner('Укажите email и сумму пополнения');
      return;
    }
    setTopUpLoading(true);
    try {
      await api.post('/admin/wallets/top-up', {
        target_email: topUpForm.email,
        amount: Number(topUpForm.amount),
        description: topUpForm.description || `Ручное пополнение (${topUpForm.email})`,
      });
      setBanner('Баланс пользователя пополнен');
      setTopUpForm({ email: '', amount: '', description: '' });
      fetchTransactions();
      if (activeTab === 'users') {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to top up wallet', error);
      setBanner('Не удалось пополнить кошелек');
    } finally {
      setTopUpLoading(false);
    }
  };

  const resetConsultationForm = () => {
    setConsultationForm({
      patient: '',
      doctor: '',
      date: '',
      time: '',
      duration: 30,
      points: 100,
    });
  };

  const openDoctorModal = async (doctorId: number) => {
    try {
      const { data } = await api.get<AdminDoctorProfile>(`/admin/doctors/${doctorId}`);
      setSelectedDoctorProfile(data);
      setDoctorForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        middle_name: data.middle_name || '',
        specialty: data.specialty || '',
        experience_years: data.experience_years?.toString() || '',
        consultation_price_points: data.consultation_price_points?.toString() || '',
        short_description: data.short_description || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || '',
        rating: data.rating?.toString() || '4.8',
        reviews_count: data.reviews_count?.toString() || '0',
        verification_status: data.verification_status || 'approved',
      });
      setShowDoctorModal(true);
    } catch (error) {
      console.error('Failed to load doctor profile', error);
      setBanner('Не удалось загрузить профиль врача');
    }
  };

  const openScheduleModal = async (doctorId: number) => {
    try {
      const { data } = await api.get<AdminDoctorProfile>(`/admin/doctors/${doctorId}`);
      setSelectedScheduleDoctor(data);
      setSlotDrafts([]);
      setExistingSlots([]);
      setSlotDate('');
      setSlotTime('');
      setShowScheduleModal(true);
      fetchDoctorSlots(doctorId);
    } catch (error) {
      console.error('Failed to load doctor schedule', error);
      setBanner('Не удалось загрузить расписание врача');
    }
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setSelectedScheduleDoctor(null);
    setSlotDrafts([]);
    setExistingSlots([]);
  };

  const closeDoctorModal = () => {
    setShowDoctorModal(false);
    setSelectedDoctorProfile(null);
  };

  const handleDoctorFormChange = (field: string, value: string) => {
    setDoctorForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDoctorProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDoctorProfile) return;
    setSavingDoctor(true);
    try {
      const payload = {
        first_name: doctorForm.first_name || undefined,
        last_name: doctorForm.last_name || undefined,
        middle_name: doctorForm.middle_name || undefined,
        specialty: doctorForm.specialty || undefined,
        experience_years: doctorForm.experience_years ? Number(doctorForm.experience_years) : undefined,
        consultation_price_points: doctorForm.consultation_price_points ? Number(doctorForm.consultation_price_points) : undefined,
        short_description: doctorForm.short_description || undefined,
        bio: doctorForm.bio || undefined,
        avatar_url: doctorForm.avatar_url || undefined,
        rating: doctorForm.rating ? Number(doctorForm.rating) : undefined,
        reviews_count: doctorForm.reviews_count ? Number(doctorForm.reviews_count) : undefined,
        verification_status: doctorForm.verification_status || undefined,
      };
      await api.patch(`/admin/doctors/${selectedDoctorProfile.id}`, payload);
      setBanner('Профиль врача обновлён');
      fetchDoctorProfiles();
      fetchPendingDoctors();
      closeDoctorModal();
    } catch (error) {
      console.error('Failed to update doctor profile', error);
      setBanner('Не удалось обновить профиль врача');
    } finally {
      setSavingDoctor(false);
    }
  };

  const handleAddSlotDraft = () => {
    if (!slotDate || !slotTime || slotDuration <= 0) return;
    const start = new Date(`${slotDate}T${slotTime}`);
    const end = new Date(start.getTime() + slotDuration * 60000);
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const label = `${start.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}, ${start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · ${slotDuration} мин`;
    setSlotDrafts((prev) => [...prev, { start_time: startISO, end_time: endISO, label }]);
    setSlotTime('');
  };

  const handleRemoveSlotDraft = (index: number) => {
    setSlotDrafts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateSlots = async () => {
    if (!selectedScheduleDoctor || slotDrafts.length === 0) {
      setBanner('Добавьте хотя бы один слот перед сохранением');
      return;
    }
    setCreatingSlots(true);
    try {
      await api.post(`/admin/doctors/${selectedScheduleDoctor.id}/slots`, {
        slots: slotDrafts.map((slot) => ({ start_time: slot.start_time, end_time: slot.end_time })),
      });
      setBanner('Расписание врача обновлено');
      setSlotDrafts([]);
      fetchDoctorSlots(selectedScheduleDoctor.id);
    } catch (error) {
      console.error('Failed to create slots', error);
      setBanner('Не удалось создать слоты расписания');
    } finally {
      setCreatingSlots(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!selectedScheduleDoctor) return;
    try {
      await api.delete(`/admin/doctors/${selectedScheduleDoctor.id}/slots/${slotId}`);
      setExistingSlots((prev) => prev.filter((slot) => slot.id !== slotId));
      setBanner('Слот удалён');
    } catch (error) {
      console.error('Failed to delete slot', error);
      setBanner('Не удалось удалить слот (возможно, он уже забронирован)');
    }
  };

  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultationForm.date || !consultationForm.time || !consultationForm.patient || !consultationForm.doctor) {
      setBanner('Заполните все обязательные поля');
      return;
    }

    const start = new Date(`${consultationForm.date}T${consultationForm.time}`);

    try {
      await api.post('/admin/consultations', {
        patient_email: consultationForm.patient,
        doctor_email: consultationForm.doctor,
        start_time: start.toISOString(),
        duration_minutes: Number(consultationForm.duration),
        points_cost: Number(consultationForm.points),
        auto_top_up: true,
      });
      setBanner('Консультация создана');
      setShowConsultationModal(false);
      resetConsultationForm();
      fetchConsultations();
    } catch (error: any) {
      console.error('Failed to create consultation', error);
      const detail = error?.response?.data?.detail;
      if (Array.isArray(detail)) {
        const message = detail
          .map((item) => (typeof item === 'string' ? item : item?.msg))
          .filter(Boolean)
          .join('; ');
        setBanner(message || 'Не удалось создать консультацию');
      } else if (typeof detail === 'string') {
        setBanner(detail);
      } else {
        setBanner('Не удалось создать консультацию');
      }
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="admin-page">
      <Navigation />

      <div className="page-header">
        <div className="container">
          <h1>Панель администратора</h1>
          <p>Мониторинг DocLink, управление пользователями и консультациями</p>
        </div>
      </div>

    <div className="container">
        {banner && (
          <div className="admin-banner" onClick={() => setBanner(null)}>
            {banner}
          </div>
        )}

        {stats && (
          <div className="admin-stats-grid fade-in">
            <div className="admin-stat-card">
              <div className="admin-stat-icon blue">👥</div>
              <div className="admin-stat-value">{stats.total_users}</div>
              <div className="admin-stat-label">Всего пользователей</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon green">👨‍⚕️</div>
              <div className="admin-stat-value">{stats.active_doctors}</div>
              <div className="admin-stat-label">Верифицированных врачей</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon pink">📹</div>
              <div className="admin-stat-value">{stats.total_consultations}</div>
              <div className="admin-stat-label">Консультаций проведено</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon purple">💰</div>
              <div className="admin-stat-value">{stats.total_revenue_points}</div>
              <div className="admin-stat-label">Поинтов в обороте</div>
            </div>
          </div>
        )}

        <div className="admin-tabs">
          {(
            [
              { id: 'overview', label: 'Обзор' },
              { id: 'users', label: 'Пользователи' },
              { id: 'doctors', label: 'Врачи' },
              { id: 'consultations', label: 'Консультации' },
              { id: 'transactions', label: 'Транзакции' },
            ] as { id: AdminTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="admin-section fade-in">
            <div className="section-header">
              <h2 className="section-title">Быстрые действия</h2>
              <button className="btn btn-primary" onClick={() => { setActiveTab('consultations'); setShowConsultationModal(true); }}>
                Создать консультацию
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Используйте вкладки выше, чтобы управлять пользователями, врачами, кошельками и консультациями DocLink.
            </p>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-section fade-in">
            <div className="section-header">
              <h2 className="section-title">Пользователи</h2>
            </div>

            <div className="search-filter-bar">
              <input
                type="text"
                className="search-input"
                placeholder="Поиск по имени или email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="filter-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              >
                <option value="all">Все роли</option>
                <option value="patient">Пациенты</option>
                <option value="doctor">Врачи</option>
                <option value="admin">Администраторы</option>
              </select>
            </div>

            {usersLoading ? (
              <div className="empty-state">Загружаем пользователей…</div>
            ) : usersError ? (
              <div className="empty-state">{usersError}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">Пользователи не найдены</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Роль</th>
                    <th>Баланс</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-info-cell">
                          <div className="user-avatar-small">
                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="user-details">
                            <h4>{user.full_name || '—'}</h4>
                            <p>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${user.role.toLowerCase()}`}>
                          {user.role === 'PATIENT' ? 'Пациент' : user.role === 'DOCTOR' ? 'Врач' : 'Администратор'}
                        </span>
                      </td>
                      <td>{user.wallet_balance !== undefined ? `${user.wallet_balance} pts` : '—'}</td>
                      <td>
                        <span className={`status-badge ${user.is_active ? 'active' : 'blocked'}`}>
                          {user.is_active ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {user.role !== 'ADMIN' && (
                            <button className="action-btn" onClick={() => handleUserRoleChange(user.id, 'admin')}>
                              ↑
                            </button>
                          )}
                          {user.role === 'ADMIN' && (
                            <button className="action-btn" onClick={() => handleUserRoleChange(user.id, 'patient')}>
                              ↓
                            </button>
                          )}
                          <button
                            className="action-btn danger"
                            onClick={() => handleToggleUser(user.id, !user.is_active)}
                          >
                            {user.is_active ? '✕' : '✔'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'doctors' && (
          <div className="admin-section fade-in">
            <div className="section-header">
              <h2 className="section-title">Врачи на модерации</h2>
            </div>

            {doctorsLoading ? (
              <div className="empty-state">Загружаем заявки…</div>
            ) : pendingDoctors.length === 0 ? (
              <div className="empty-state">Нет заявок на модерацию</div>
            ) : (
              <div className="doctor-cards-grid">
                {pendingDoctors.map((doctor) => (
                  <div key={doctor.id} className="doctor-card">
                    <div className="doctor-card-header">
                      <div>
                        <h4>{doctor.first_name || 'Имя'} {doctor.last_name || ''}</h4>
                        <p>{doctor.email || '—'}</p>
                      </div>
                      <span className="tag">{doctor.specialty || 'Специальность не указана'}</span>
                    </div>
                    <p className="doctor-meta">
                      Опыт работы: {doctor.experience_years ? `${doctor.experience_years} лет` : 'не указан'}
                    </p>
                    <div className="doctor-actions">
                      <button className="btn btn-primary" onClick={() => handleDoctorDecision(doctor.id, 'approved')}>
                        Одобрить
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleDoctorDecision(doctor.id, 'rejected')}>
                        Отклонить
                      </button>
                      <button className="btn btn-text" onClick={() => openDoctorModal(doctor.id)}>
                        Заполнить карточку
                      </button>
                      <button className="btn btn-text" onClick={() => openScheduleModal(doctor.id)}>
                        Расписание
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'doctors' && (
          <div className="admin-section fade-in">
            <div className="section-header">
              <h2 className="section-title">Профили врачей</h2>
            </div>
            {doctorProfilesLoading ? (
              <div className="empty-state">Загружаем профили…</div>
            ) : doctorProfiles.length === 0 ? (
              <div className="empty-state">Пока нет заполненных профилей</div>
            ) : (
              <table className="admin-table doctor-profiles-table">
                <thead>
                  <tr>
                    <th>Врач</th>
                    <th>Специальность</th>
                    <th>Цена</th>
                    <th>Рейтинг</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorProfiles.map((doctor) => (
                    <tr key={doctor.id}>
                      <td>
                        <div className="doctor-profile-cell">
                          <div className="doctor-avatar-round">
                            {doctor.avatar_url ? (
                              <img src={doctor.avatar_url} alt={doctor.first_name || 'Врач'} />
                            ) : (
                              (doctor.first_name || 'D').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <strong>{`${doctor.first_name ?? ''} ${doctor.last_name ?? ''}`.trim() || 'Врач DocLink'}</strong>
                            <div className="text-muted">{doctor.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{doctor.specialty || '—'}</div>
                        <div className="text-muted">{doctor.short_description}</div>
                      </td>
                      <td>{doctor.consultation_price_points ? `${doctor.consultation_price_points} pts` : '—'}</td>
                      <td>
                        {doctor.rating !== undefined && doctor.rating !== null
                          ? Number(doctor.rating).toFixed(1)
                          : '—'}{' '}
                        <span className="text-muted">({doctor.reviews_count ?? 0})</span>
                      </td>
                      <td>
                        <span className={`status-chip ${doctor.is_verified ? 'status-completed' : 'status-created'}`}>
                          {doctor.is_verified ? 'Опубликован' : doctor.verification_status === 'pending' ? 'На модерации' : 'Черновик'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary" onClick={() => openDoctorModal(doctor.id)}>
                          Редактировать
                        </button>
                        <button className="btn btn-text" onClick={() => openScheduleModal(doctor.id)}>
                          Расписание
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'consultations' && (
          <div className="admin-section fade-in">
            <div className="section-header">
              <h2 className="section-title">Консультации</h2>
              <div className="section-actions">
                <select
                  className="filter-select"
                  value={consultationStatus}
                  onChange={(e) => setConsultationStatus(e.target.value as typeof consultationStatus)}
                >
                  <option value="all">Все статусы</option>
                  <option value="created">Создана</option>
                  <option value="active">Активна</option>
                  <option value="completed">Завершена</option>
                  <option value="cancelled">Отменена</option>
                </select>
                <button className="btn btn-primary" onClick={() => setShowConsultationModal(true)}>
                  + Новая консультация
                </button>
              </div>
            </div>

            {consultationsLoading ? (
              <div className="empty-state">Загружаем консультации…</div>
            ) : consultations.length === 0 ? (
              <div className="empty-state">Консультации не найдены</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Пациент</th>
                    <th>Врач</th>
                    <th>Время</th>
                    <th>Стоимость</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((consultation) => (
                    <tr key={consultation.id}>
                      <td>
                        <strong>{consultation.patient_name || '—'}</strong>
                        <div className="text-muted">{consultation.patient_email}</div>
                      </td>
                      <td>
                        <strong>{consultation.doctor_name || '—'}</strong>
                        <div className="text-muted">{consultation.doctor_email}</div>
                      </td>
                      <td>{formatDateTime(consultation.slot_start_time)}</td>
                      <td>{consultation.points_cost} pts</td>
                      <td>
                        <span className={`status-chip status-${consultation.status}`}>
                          {consultation.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {['created', 'active'].includes(consultation.status) && (
                            <button className="action-btn" onClick={() => handleConsultationAction(consultation.id, 'completed')}>
                              ✓
                            </button>
                          )}
                          {consultation.status !== 'cancelled' && consultation.status !== 'completed' && (
                            <button className="action-btn danger" onClick={() => handleConsultationAction(consultation.id, 'cancelled')}>
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="admin-section fade-in">
            <div className="section-header">
              <h2 className="section-title">Пополнения и транзакции</h2>
            </div>
            <div className="manual-topup-card">
              <div>
                <h3>Ручное пополнение кошелька</h3>
                <p className="text-muted">Укажите email и сумму в поинтах, чтобы пополнить баланс пользователя.</p>
              </div>
              <form className="manual-topup-form" onSubmit={handleManualTopUp}>
                <label>
                  Email пользователя
                  <input
                    type="email"
                    value={topUpForm.email}
                    onChange={(e) => setTopUpForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="user@example.com"
                    required
                  />
                </label>
                <label>
                  Сумма (pts)
                  <input
                    type="number"
                    min={1}
                    value={topUpForm.amount}
                    onChange={(e) => setTopUpForm((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Комментарий
                  <input
                    type="text"
                    value={topUpForm.description}
                    onChange={(e) => setTopUpForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Например: Тестовое пополнение"
                  />
                </label>
                <button type="submit" className="btn btn-primary" disabled={topUpLoading}>
                  {topUpLoading ? 'Пополняем…' : 'Пополнить'}
                </button>
              </form>
            </div>
            {transactionsLoading ? (
              <div className="empty-state">Загружаем операции…</div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">Транзакции не найдены</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Тип</th>
                    <th>Сумма</th>
                    <th>Баланс после</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>#{tx.id}</td>
                      <td>{tx.transaction_type}</td>
                      <td>{tx.amount}</td>
                      <td>{tx.balance_after ?? '—'}</td>
                      <td>{formatDateTime(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showConsultationModal && (
        <div className="admin-modal-overlay" onClick={() => setShowConsultationModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Новая консультация</h3>
              <button className="modal-close" onClick={() => setShowConsultationModal(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={handleCreateConsultation}>
              <div className="modal-form-grid">
                <label>
                  Пациент (email)
                  <input
                    type="email"
                    value={consultationForm.patient}
                    onChange={(e) => setConsultationForm((prev) => ({ ...prev, patient: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Врач (email)
                  <input
                    type="email"
                    value={consultationForm.doctor}
                    onChange={(e) => setConsultationForm((prev) => ({ ...prev, doctor: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Дата
                  <input
                    type="date"
                    value={consultationForm.date}
                    onChange={(e) => setConsultationForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Время
                  <input
                    type="time"
                    value={consultationForm.time}
                    onChange={(e) => setConsultationForm((prev) => ({ ...prev, time: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Длительность (мин)
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={consultationForm.duration}
                    onChange={(e) => setConsultationForm((prev) => ({ ...prev, duration: Number(e.target.value) }))}
                  />
                </label>
                <label>
                  Стоимость (pts)
                  <input
                    type="number"
                    min={10}
                    value={consultationForm.points}
                    onChange={(e) => setConsultationForm((prev) => ({ ...prev, points: Number(e.target.value) }))}
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConsultationModal(false)}>
                  Отменить
                </button>
                <button type="submit" className="btn btn-primary">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    {showDoctorModal && selectedDoctorProfile && (
      <div className="admin-modal-overlay" onClick={closeDoctorModal}>
        <div className="admin-modal doctor-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Редактирование врача</h3>
            <button className="modal-close" onClick={closeDoctorModal}>✕</button>
          </div>
          <form className="modal-body" onSubmit={handleSaveDoctorProfile}>
            <div className="modal-form-grid">
              <label>
                Имя
                <input
                  type="text"
                  value={doctorForm.first_name}
                  onChange={(e) => handleDoctorFormChange('first_name', e.target.value)}
                  required
                />
              </label>
              <label>
                Фамилия
                <input
                  type="text"
                  value={doctorForm.last_name}
                  onChange={(e) => handleDoctorFormChange('last_name', e.target.value)}
                  required
                />
              </label>
              <label>
                Отчество
                <input
                  type="text"
                  value={doctorForm.middle_name}
                  onChange={(e) => handleDoctorFormChange('middle_name', e.target.value)}
                />
              </label>
              <label>
                Специальность
                <input
                  type="text"
                  value={doctorForm.specialty}
                  onChange={(e) => handleDoctorFormChange('specialty', e.target.value)}
                  required
                />
              </label>
              <label>
                Опыт (лет)
                <input
                  type="number"
                  min={0}
                  value={doctorForm.experience_years}
                  onChange={(e) => handleDoctorFormChange('experience_years', e.target.value)}
                />
              </label>
              <label>
                Цена (pts)
                <input
                  type="number"
                  min={0}
                  value={doctorForm.consultation_price_points}
                  onChange={(e) => handleDoctorFormChange('consultation_price_points', e.target.value)}
                />
              </label>
              <label>
                Короткое описание
                <input
                  type="text"
                  value={doctorForm.short_description}
                  onChange={(e) => handleDoctorFormChange('short_description', e.target.value)}
                />
              </label>
              <label>
                Фото (URL)
                <input
                  type="url"
                  value={doctorForm.avatar_url}
                  onChange={(e) => handleDoctorFormChange('avatar_url', e.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label>
                Рейтинг
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={doctorForm.rating}
                  onChange={(e) => handleDoctorFormChange('rating', e.target.value)}
                />
              </label>
              <label>
                Отзывы
                <input
                  type="number"
                  min={0}
                  value={doctorForm.reviews_count}
                  onChange={(e) => handleDoctorFormChange('reviews_count', e.target.value)}
                />
              </label>
              <label>
                Статус
                <select
                  value={doctorForm.verification_status}
                  onChange={(e) => handleDoctorFormChange('verification_status', e.target.value)}
                >
                  <option value="approved">Опубликован</option>
                  <option value="pending">На модерации</option>
                  <option value="rejected">Отклонён</option>
                </select>
              </label>
            </div>
            <label>
              Развёрнутое описание
              <textarea
                value={doctorForm.bio}
                onChange={(e) => handleDoctorFormChange('bio', e.target.value)}
                rows={4}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeDoctorModal}>
                Отмена
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingDoctor}>
                {savingDoctor ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
      {showScheduleModal && selectedScheduleDoctor && (
        <div className="admin-modal-overlay" onClick={closeScheduleModal}>
          <div className="admin-modal schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Расписание врача{' '}
                {`${selectedScheduleDoctor.first_name ?? ''} ${selectedScheduleDoctor.last_name ?? ''}`.trim() ||
                  selectedScheduleDoctor.email}
              </h3>
              <button className="modal-close" onClick={closeScheduleModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="slots-builder">
                <div className="slots-builder-header">
                  <h4>Создать слоты</h4>
                  <p className="text-muted">
                    Добавьте новые окна для записи. Мы автоматически проверим пересечения в расписании.
                  </p>
                </div>
                <div className="slots-form">
                  <label>
                    Дата
                    <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
                  </label>
                  <label>
                    Время начала
                    <input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} />
                  </label>
                  <label>
                    Длительность (мин)
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(Number(e.target.value))}
                    />
                  </label>
                  <button className="btn btn-secondary" type="button" onClick={handleAddSlotDraft}>
                    Добавить слот
                  </button>
                </div>
                {slotDrafts.length > 0 && (
                  <div className="slots-draft-list">
                    {slotDrafts.map((slot, index) => (
                      <div key={slot.start_time} className="slot-draft-item">
                        <span>{slot.label}</span>
                        <button className="btn btn-text" onClick={() => handleRemoveSlotDraft(index)}>
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="slots-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateSlots}
                    disabled={creatingSlots || slotDrafts.length === 0}
                  >
                    {creatingSlots ? 'Создаём…' : 'Сохранить слоты'}
                  </button>
                </div>
              </div>
              <div className="existing-slots">
                <h4>Текущее расписание</h4>
                {existingSlotsLoading ? (
                  <div className="slots-empty">Загружаем текущие слоты…</div>
                ) : existingSlots.length === 0 ? (
                  <div className="slots-empty">У врача пока нет открытых слотов</div>
                ) : (
                  <div className="slots-list">
                    {existingSlots.map((slot) => (
                      <div key={slot.id} className="slot-existing-item">
                        <div>
                          <div className="slot-existing-date">
                            {formatDateTime(slot.start_time)} — {formatDateTime(slot.end_time)}
                          </div>
                          {slot.is_reserved && <span className="slot-tag reserved">Забронирован</span>}
                        </div>
                        <button
                          className="btn btn-text danger"
                          disabled={slot.is_reserved}
                          onClick={() => handleDeleteSlot(slot.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
