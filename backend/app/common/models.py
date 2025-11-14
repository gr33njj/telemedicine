from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum as SQLEnum, Numeric, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from decimal import Decimal
from app.common.database import Base


class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    role = Column(SQLEnum(UserRole), default=UserRole.PATIENT, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False)
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False)
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    refresh_tokens = relationship("RefreshToken", back_populates="user")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(500), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="refresh_tokens")


class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    middle_name = Column(String(100))
    date_of_birth = Column(DateTime(timezone=True))
    gender = Column(String(20))
    phone = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="patient_profile")
    medical_files = relationship("MedicalFile", back_populates="patient")


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    middle_name = Column(String(100))
    specialty = Column(String(200))
    experience_years = Column(Integer)
    consultation_price_points = Column(Integer, default=0)
    short_description = Column(String(255))
    bio = Column(Text)
    avatar_url = Column(String(500))
    rating = Column(Numeric(3, 1), default=Decimal("4.8"))
    reviews_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    verification_status = Column(String(50), default="pending")  # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="doctor_profile")
    certificates = relationship("DoctorCertificate", back_populates="doctor")
    schedules = relationship("ScheduleSlot", back_populates="doctor")
    consultations = relationship("Consultation", back_populates="doctor")


class DoctorCertificate(Base):
    __tablename__ = "doctor_certificates"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    file_url = Column(String(500))
    file_name = Column(String(255))
    certificate_type = Column(String(100))  # diploma, license, certificate
    issued_date = Column(DateTime(timezone=True))
    expiry_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    doctor = relationship("DoctorProfile", back_populates="certificates")


class MedicalFile(Base):
    __tablename__ = "medical_files"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"), nullable=False)
    file_url = Column(String(500))
    file_name = Column(String(255))
    file_type = Column(String(50))
    description = Column(Text)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    patient = relationship("PatientProfile", back_populates="medical_files")


class ScheduleSlot(Base):
    __tablename__ = "schedule_slots"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    is_available = Column(Boolean, default=True)
    is_reserved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    doctor = relationship("DoctorProfile", back_populates="schedules")
    consultation = relationship("Consultation", back_populates="slot", uselist=False)


class ConsultationStatus(str, enum.Enum):
    CREATED = "created"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Consultation(Base):
    __tablename__ = "consultations"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("schedule_slots.id"), nullable=False)
    status = Column(SQLEnum(ConsultationStatus), default=ConsultationStatus.CREATED)
    room_id = Column(String(100), unique=True)
    points_cost = Column(Integer, nullable=False)
    points_frozen = Column(Boolean, default=True)
    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    patient = relationship("PatientProfile")
    doctor = relationship("DoctorProfile", back_populates="consultations")
    slot = relationship("ScheduleSlot", back_populates="consultation")
    messages = relationship("ConsultationMessage", back_populates="consultation")
    files = relationship("ConsultationFile", back_populates="consultation")
    emr_records = relationship("EMRRecord", back_populates="consultation")


class ConsultationMessage(Base):
    __tablename__ = "consultation_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    consultation = relationship("Consultation", back_populates="messages")


class ConsultationFile(Base):
    __tablename__ = "consultation_files"
    
    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False)
    file_url = Column(String(500))
    file_name = Column(String(255))
    file_type = Column(String(50))
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    consultation = relationship("Consultation", back_populates="files")


class Wallet(Base):
    __tablename__ = "wallets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    balance = Column(Numeric(10, 2), default=0)
    frozen_balance = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet")


class TransactionType(str, enum.Enum):
    PURCHASE = "PURCHASE"
    DEBIT = "DEBIT"
    REFUND = "REFUND"
    ADJUSTMENT = "ADJUSTMENT"
    FREEZE = "FREEZE"
    UNFREEZE = "UNFREEZE"
    CREDIT = "CREDIT"


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=False)
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    balance_before = Column(Numeric(10, 2))
    balance_after = Column(Numeric(10, 2))
    description = Column(Text)
    related_consultation_id = Column(Integer, ForeignKey("consultations.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    wallet = relationship("Wallet", back_populates="transactions")


class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="RUB")
    points_amount = Column(Integer, nullable=False)
    payment_provider = Column(String(50))  # stripe, cloudpayments, yookassa
    provider_transaction_id = Column(String(255))
    status = Column(String(50), default="pending")  # pending, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    points_cost = Column(Integer, nullable=False)
    duration_days = Column(Integer, nullable=False)
    consultation_type = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EMRRecord(Base):
    __tablename__ = "emr_records"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    consultation_id = Column(Integer, ForeignKey("consultations.id"))
    diagnosis = Column(Text)
    symptoms = Column(Text)
    treatment = Column(Text)
    recommendations = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    consultation = relationship("Consultation", back_populates="emr_records")


class WithdrawalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class Withdrawal(Base):
    __tablename__ = "withdrawals"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(SQLEnum(WithdrawalStatus), default=WithdrawalStatus.PENDING)
    bank_account = Column(String(255))  # Зашифрованный номер счета
    bank_name = Column(String(255))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    doctor = relationship("DoctorProfile")


class DoctorEarnings(Base):
    __tablename__ = "doctor_earnings"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), unique=True, nullable=False)
    total_earned = Column(Numeric(10, 2), default=0)  # Всего заработано
    available_balance = Column(Numeric(10, 2), default=0)  # Доступно для вывода
    total_withdrawn = Column(Numeric(10, 2), default=0)  # Всего выведено
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    doctor = relationship("DoctorProfile")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50))  # email, sms, push
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

