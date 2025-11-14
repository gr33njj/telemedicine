from datetime import timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.admin.schemas import (
    AdminConsultationCreate,
    AdminConsultationUpdate,
    AdminDoctorProfileResponse,
    AdminDoctorSlotsRequest,
    AdminDoctorUpdate,
    AdminUserUpdate,
    AdminWalletTopUpRequest,
    DoctorVerificationUpdate,
    ExchangeRateUpdate,
)
from app.common.models import (
    Consultation,
    ConsultationStatus,
    DoctorProfile,
    PatientProfile,
    ScheduleSlot,
    User,
    UserRole,
    Wallet,
    WalletTransaction,
    TransactionType,
)
from app.services.consultation_service import ConsultationService
from app.wallet.service import WalletService


class AdminService:
    @staticmethod
    def get_stats(db: Session) -> dict:
        total_users = db.query(User).count()
        total_patients = db.query(User).filter(User.role == UserRole.PATIENT).count()
        total_doctors = db.query(User).filter(User.role == UserRole.DOCTOR).count()
        total_consultations = db.query(Consultation).count()

        total_revenue_points = (
            db.query(Consultation.points_cost)
            .filter(Consultation.status == ConsultationStatus.COMPLETED)
            .all()
        )
        revenue_sum = sum(points for (points,) in total_revenue_points)

        active_doctors = (
            db.query(DoctorProfile).filter(DoctorProfile.is_verified.is_(True)).count()
        )

        return {
            "total_users": total_users,
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_consultations": total_consultations,
            "total_revenue_points": revenue_sum,
            "active_doctors": active_doctors,
        }

    @staticmethod
    def _full_name_from_profiles(
        user: User,
        patient_profiles: Dict[int, PatientProfile],
        doctor_profiles: Dict[int, DoctorProfile],
    ) -> Optional[str]:
        profile = patient_profiles.get(user.id) or doctor_profiles.get(user.id)
        if not profile:
            return None
        names = [profile.first_name, profile.last_name]
        name = " ".join(filter(None, names)).strip()
        return name or None

    @staticmethod
    def _ensure_profiles_for_user(db: Session, user: User) -> None:
        patient_profile = (
            db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()
        )
        if not patient_profile:
            patient_profile = PatientProfile(user_id=user.id)
            db.add(patient_profile)
            db.flush()

        doctor_profile = (
            db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
        )
        if user.role == UserRole.DOCTOR and not doctor_profile:
            doctor_profile = DoctorProfile(
                user_id=user.id,
                verification_status="pending",
                is_verified=False,
            )
            db.add(doctor_profile)
            db.flush()

    @staticmethod
    def _serialize_user(
        user: User,
        patient_profiles: Dict[int, PatientProfile],
        doctor_profiles: Dict[int, DoctorProfile],
        wallets: Dict[int, Wallet],
    ) -> dict:
        return {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "full_name": AdminService._full_name_from_profiles(
                user, patient_profiles, doctor_profiles
            ),
            "wallet_balance": float(wallets[user.id].balance)
            if user.id in wallets and wallets[user.id].balance is not None
            else None,
            "patient_profile_id": patient_profiles.get(user.id).id
            if user.id in patient_profiles
            else None,
            "doctor_profile_id": doctor_profiles.get(user.id).id
            if user.id in doctor_profiles
            else None,
        }

    @staticmethod
    def get_users(
        db: Session,
        role: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[dict]:
        query = db.query(User).order_by(User.created_at.desc())
        if role:
            try:
                query = query.filter(User.role == UserRole(role.lower()))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid role filter",
                )

        users = query.limit(limit).offset(offset).all()
        user_ids = [user.id for user in users]

        patient_profiles = {
            profile.user_id: profile
            for profile in db.query(PatientProfile).filter(
                PatientProfile.user_id.in_(user_ids)
            )
        }
        doctor_profiles = {
            profile.user_id: profile
            for profile in db.query(DoctorProfile).filter(
                DoctorProfile.user_id.in_(user_ids)
            )
        }
        wallets = {
            wallet.user_id: wallet
            for wallet in db.query(Wallet).filter(Wallet.user_id.in_(user_ids))
        }

        return [
            AdminService._serialize_user(
                user, patient_profiles, doctor_profiles, wallets
            )
            for user in users
        ]

    @staticmethod
    def update_user(
        db: Session,
        user_id: int,
        payload: AdminUserUpdate,
    ) -> dict:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        if payload.role:
            try:
                user.role = UserRole(payload.role.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role"
                )
        if payload.is_active is not None:
            user.is_active = payload.is_active

        db.commit()
        db.refresh(user)

        AdminService._ensure_profiles_for_user(db, user)
        db.commit()

        patient_profiles = {
            profile.user_id: profile
            for profile in db.query(PatientProfile).filter(
                PatientProfile.user_id == user.id
            )
        }
        doctor_profiles = {
            profile.user_id: profile
            for profile in db.query(DoctorProfile).filter(
                DoctorProfile.user_id == user.id
            )
        }
        wallets = {
            wallet.user_id: wallet
            for wallet in db.query(Wallet).filter(Wallet.user_id == user.id)
        }

        return AdminService._serialize_user(
            user, patient_profiles, doctor_profiles, wallets
        )

    @staticmethod
    def get_pending_doctors(db: Session) -> List[dict]:
        doctor_users = db.query(User).filter(User.role == UserRole.DOCTOR).all()
        if doctor_users:
            existing_profiles = {
                profile.user_id for profile in db.query(DoctorProfile.user_id).all()
            }
            missing_profiles = {user.id for user in doctor_users} - existing_profiles
            if missing_profiles:
                for user in doctor_users:
                    if user.id in missing_profiles:
                        db.add(
                            DoctorProfile(
                                user_id=user.id,
                                verification_status="pending",
                                is_verified=False,
                            )
                        )
                db.commit()

        doctors = (
            db.query(DoctorProfile)
            .filter(DoctorProfile.verification_status == "pending")
            .order_by(DoctorProfile.created_at.asc())
            .all()
        )
        users = {
            user.id: user
            for user in db.query(User).filter(
                User.id.in_([doctor.user_id for doctor in doctors])
            )
        }

        result = []
        for doctor in doctors:
            user = users.get(doctor.user_id)
            result.append(
                {
                    "id": doctor.id,
                    "user_id": doctor.user_id,
                    "email": user.email if user else None,
                    "first_name": doctor.first_name,
                    "last_name": doctor.last_name,
                    "specialty": doctor.specialty,
                    "experience_years": doctor.experience_years,
                    "short_description": doctor.short_description,
                    "avatar_url": doctor.avatar_url,
                    "rating": float(doctor.rating) if doctor.rating is not None else None,
                    "reviews_count": doctor.reviews_count,
                    "consultation_price_points": doctor.consultation_price_points,
                    "is_verified": doctor.is_verified,
                    "created_at": doctor.created_at.isoformat()
                    if doctor.created_at
                    else None,
                }
            )
        return result

    @staticmethod
    def get_doctor_profiles(db: Session) -> List[AdminDoctorProfileResponse]:
        doctors = db.query(DoctorProfile).order_by(DoctorProfile.created_at.desc()).all()
        user_ids = [doctor.user_id for doctor in doctors]
        users = {
            user.id: user
            for user in db.query(User).filter(User.id.in_(user_ids))
        } if user_ids else {}
        return [
            AdminService._serialize_doctor_profile(doctor, users.get(doctor.user_id))
            for doctor in doctors
        ]

    @staticmethod
    def get_doctor_profile(db: Session, doctor_id: int) -> AdminDoctorProfileResponse:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found"
            )
        user = db.query(User).filter(User.id == doctor.user_id).first()
        return AdminService._serialize_doctor_profile(doctor, user)

    @staticmethod
    def _serialize_doctor_profile(
        doctor: DoctorProfile, user: Optional[User]
    ) -> AdminDoctorProfileResponse:
        return AdminDoctorProfileResponse(
            id=doctor.id,
            user_id=doctor.user_id,
            email=user.email if user else None,
            first_name=doctor.first_name,
            last_name=doctor.last_name,
            middle_name=doctor.middle_name,
            specialty=doctor.specialty,
            experience_years=doctor.experience_years,
            consultation_price_points=doctor.consultation_price_points,
            short_description=doctor.short_description,
            bio=doctor.bio,
            avatar_url=doctor.avatar_url,
            rating=float(doctor.rating) if doctor.rating is not None else None,
            reviews_count=doctor.reviews_count,
            is_verified=doctor.is_verified,
            verification_status=doctor.verification_status,
            created_at=doctor.created_at,
        )

    @staticmethod
    def update_doctor_profile(
        db: Session, doctor_id: int, payload: AdminDoctorUpdate
    ) -> AdminDoctorProfileResponse:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found"
            )
        update_data = payload.dict(exclude_unset=True)
        verification_status = update_data.pop("verification_status", None)
        for field, value in update_data.items():
            setattr(doctor, field, value)
        if verification_status:
            doctor.verification_status = verification_status
            doctor.is_verified = verification_status == "approved"
        db.commit()
        db.refresh(doctor)
        user = db.query(User).filter(User.id == doctor.user_id).first()
        return AdminService._serialize_doctor_profile(doctor, user)

    @staticmethod
    def create_doctor_slots(
        db: Session, doctor_id: int, slots_payload: AdminDoctorSlotsRequest
    ) -> List[dict]:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found"
            )
        created: List[ScheduleSlot] = []
        for slot in slots_payload.slots:
            overlap = (
                db.query(ScheduleSlot)
                .filter(ScheduleSlot.doctor_id == doctor.id)
                .filter(ScheduleSlot.start_time < slot.end_time)
                .filter(ScheduleSlot.end_time > slot.start_time)
                .first()
            )
            if overlap:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="В указанном диапазоне уже есть слот",
                )
            schedule = ScheduleSlot(
                doctor_id=doctor.id,
                start_time=slot.start_time,
                end_time=slot.end_time,
                is_available=True,
                is_reserved=False,
            )
            db.add(schedule)
            created.append(schedule)
        db.commit()
        for schedule in created:
            db.refresh(schedule)
        return [
            {
                "id": schedule.id,
                "doctor_id": schedule.doctor_id,
                "start_time": schedule.start_time,
                "end_time": schedule.end_time,
                "is_available": schedule.is_available,
                "is_reserved": schedule.is_reserved,
            }
            for schedule in created
        ]

    @staticmethod
    def verify_doctor(
        db: Session,
        doctor_id: int,
        verification_data: DoctorVerificationUpdate,
    ) -> dict:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found"
            )

        doctor.verification_status = verification_data.verification_status
        doctor.is_verified = verification_data.verification_status == "approved"

        db.commit()

        return {
            "status": "success",
            "doctor_id": doctor_id,
            "verification_status": verification_data.verification_status,
        }

    @staticmethod
    def _format_consultation(
        consultation: Consultation,
        patient_profiles: Dict[int, PatientProfile],
        doctor_profiles: Dict[int, DoctorProfile],
        users: Dict[int, User],
    ) -> dict:
        patient_profile = patient_profiles.get(consultation.patient_id)
        doctor_profile = doctor_profiles.get(consultation.doctor_id)
        patient_user = (
            users.get(patient_profile.user_id) if patient_profile else None
        )
        doctor_user = users.get(doctor_profile.user_id) if doctor_profile else None

        patient_name = (
            f"{patient_profile.first_name or ''} {patient_profile.last_name or ''}".strip()
            if patient_profile
            else None
        )
        doctor_name = (
            f"{doctor_profile.first_name or ''} {doctor_profile.last_name or ''}".strip()
            if doctor_profile
            else None
        )

        return {
            "id": consultation.id,
            "status": consultation.status.value
            if isinstance(consultation.status, ConsultationStatus)
            else consultation.status,
            "points_cost": consultation.points_cost,
            "patient_name": patient_name or (patient_user.email if patient_user else None),
            "patient_email": patient_user.email if patient_user else None,
            "doctor_name": doctor_name or (doctor_user.email if doctor_user else None),
            "doctor_email": doctor_user.email if doctor_user else None,
            "slot_start_time": consultation.slot.start_time
            if consultation.slot
            else None,
            "slot_end_time": consultation.slot.end_time
            if consultation.slot
            else None,
            "created_at": consultation.created_at,
        }

    @staticmethod
    def get_consultations(
        db: Session,
        status: Optional[str],
        limit: int,
        offset: int,
    ) -> List[dict]:
        query = db.query(Consultation).order_by(Consultation.created_at.desc())
        if status and status != "all":
            try:
                query = query.filter(Consultation.status == ConsultationStatus(status))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid consultation status",
                )

        consultations = query.limit(limit).offset(offset).all()

        patient_profile_ids = [c.patient_id for c in consultations]
        doctor_profile_ids = [c.doctor_id for c in consultations]

        patient_profiles = {
            profile.id: profile
            for profile in db.query(PatientProfile).filter(
                PatientProfile.id.in_(patient_profile_ids)
            )
        }
        doctor_profiles = {
            profile.id: profile
            for profile in db.query(DoctorProfile).filter(
                DoctorProfile.id.in_(doctor_profile_ids)
            )
        }
        user_ids = [
            profile.user_id
            for profile in list(patient_profiles.values()) + list(doctor_profiles.values())
        ]
        users = (
            {
                user.id: user
                for user in db.query(User).filter(User.id.in_(user_ids))
            }
            if user_ids
            else {}
        )

        return [
            AdminService._format_consultation(
                consultation, patient_profiles, doctor_profiles, users
            )
            for consultation in consultations
        ]

    @staticmethod
    def get_consultation_detail(db: Session, consultation_id: int) -> dict:
        consultation = (
            db.query(Consultation).filter(Consultation.id == consultation_id).first()
        )
        if not consultation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found"
            )

        patient_profile_obj = (
            db.query(PatientProfile)
            .filter(PatientProfile.id == consultation.patient_id)
            .first()
        )
        doctor_profile_obj = (
            db.query(DoctorProfile)
            .filter(DoctorProfile.id == consultation.doctor_id)
            .first()
        )
        patient_profiles = (
            {patient_profile_obj.id: patient_profile_obj} if patient_profile_obj else {}
        )
        doctor_profiles = (
            {doctor_profile_obj.id: doctor_profile_obj} if doctor_profile_obj else {}
        )
        user_ids: List[int] = []
        if patient_profile_obj:
            user_ids.append(patient_profile_obj.user_id)
        if doctor_profile_obj:
            user_ids.append(doctor_profile_obj.user_id)
        users = (
            {user.id: user for user in db.query(User).filter(User.id.in_(user_ids))}
            if user_ids
            else {}
        )

        return AdminService._format_consultation(
            consultation, patient_profiles=patient_profiles, doctor_profiles=doctor_profiles, users=users
        )

    @staticmethod
    def create_consultation(
        db: Session,
        payload: AdminConsultationCreate,
    ) -> dict:
        patient_user = None
        doctor_user = None

        if payload.patient_user_id:
            patient_user = (
                db.query(User).filter(User.id == payload.patient_user_id).first()
            )
        elif payload.patient_email:
            patient_user = (
                db.query(User).filter(User.email == payload.patient_email).first()
            )

        if not patient_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Patient user not found"
            )

        if payload.doctor_user_id:
            doctor_user = (
                db.query(User).filter(User.id == payload.doctor_user_id).first()
            )
        elif payload.doctor_email:
            doctor_user = (
                db.query(User).filter(User.email == payload.doctor_email).first()
            )

        if not doctor_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Doctor user not found"
            )

        if doctor_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected doctor user has incorrect role",
            )

        if patient_user.role != UserRole.PATIENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected patient user has incorrect role",
            )

        patient_profile = (
            db.query(PatientProfile)
            .filter(PatientProfile.user_id == patient_user.id)
            .first()
        )
        doctor_profile = (
            db.query(DoctorProfile)
            .filter(DoctorProfile.user_id == doctor_user.id)
            .first()
        )

        if not patient_profile or not doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profiles for patient or doctor not found",
            )

        patient_wallet = (
            db.query(Wallet).filter(Wallet.user_id == patient_user.id).first()
        )
        if not patient_wallet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient wallet not found",
            )

        wallet_balance = Decimal(patient_wallet.balance or 0)
        cost_decimal = Decimal(payload.points_cost)
        if wallet_balance < cost_decimal:
            shortfall = cost_decimal - wallet_balance
            if not payload.auto_top_up:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Patient wallet has insufficient points",
                )
            patient_wallet.balance = wallet_balance + shortfall
            top_up_transaction = WalletTransaction(
                wallet_id=patient_wallet.id,
                transaction_type=TransactionType.CREDIT,
                amount=shortfall,
                balance_before=wallet_balance,
                balance_after=patient_wallet.balance,
                description="Пополнение администратором для бронирования консультации",
            )
            db.add(top_up_transaction)
            db.flush()

        start_time = payload.start_time
        end_time = start_time + timedelta(minutes=payload.duration_minutes)

        overlap = (
            db.query(ScheduleSlot)
            .filter(ScheduleSlot.doctor_id == doctor_profile.id)
            .filter(ScheduleSlot.start_time < end_time)
            .filter(ScheduleSlot.end_time > start_time)
            .first()
        )
        if overlap:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Doctor already has a slot in this time range",
            )

        slot = ScheduleSlot(
            doctor_id=doctor_profile.id,
            start_time=start_time,
            end_time=end_time,
            is_available=True,
            is_reserved=False,
        )
        db.add(slot)
        db.flush()

        consultation = ConsultationService.book_consultation(
            db=db,
            patient_id=patient_profile.id,
            doctor_id=doctor_profile.id,
            slot_id=slot.id,
            points_cost=payload.points_cost,
        )

        return AdminService.get_consultation_detail(db, consultation.id)

    @staticmethod
    def update_consultation_status(
        db: Session,
        consultation_id: int,
        payload: AdminConsultationUpdate,
    ) -> dict:
        consultation = (
            db.query(Consultation).filter(Consultation.id == consultation_id).first()
        )
        if not consultation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found"
            )

        if payload.status == "completed":
            ConsultationService.complete_consultation(db, consultation_id)
        elif payload.status == "cancelled":
            ConsultationService.cancel_consultation(db, consultation_id, payload.reason)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported status update",
            )

        return AdminService.get_consultation_detail(db, consultation_id)

    @staticmethod
    def update_exchange_rates(rates_data: ExchangeRateUpdate) -> dict:
        updated_rates = {}

        if rates_data.rate_rub is not None:
            updated_rates["RUB"] = rates_data.rate_rub
        if rates_data.rate_usd is not None:
            updated_rates["USD"] = rates_data.rate_usd
        if rates_data.rate_eur is not None:
            updated_rates["EUR"] = rates_data.rate_eur

        return {
            "status": "success",
            "updated_rates": updated_rates,
            "message": "Exchange rates updated (in production, save to database)",
        }

    @staticmethod
    def get_all_transactions(
        db: Session,
        limit: int = 100,
        offset: int = 0,
    ) -> List[dict]:
        transactions = (
            db.query(WalletTransaction)
            .order_by(WalletTransaction.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        return [
            AdminService._serialize_transaction(transaction)
            for transaction in transactions
        ]

    @staticmethod
    def _serialize_transaction(transaction: WalletTransaction) -> dict:
        return {
            "id": transaction.id,
            "wallet_id": transaction.wallet_id,
            "transaction_type": transaction.transaction_type.value
            if isinstance(transaction.transaction_type, TransactionType)
            else transaction.transaction_type,
            "amount": float(transaction.amount),
            "balance_before": float(transaction.balance_before)
            if transaction.balance_before is not None
            else None,
            "balance_after": float(transaction.balance_after)
            if transaction.balance_after is not None
            else None,
            "description": transaction.description,
            "related_consultation_id": transaction.related_consultation_id,
            "created_at": transaction.created_at.isoformat()
            if transaction.created_at
            else None,
        }

    @staticmethod
    def manual_top_up(db: Session, payload: AdminWalletTopUpRequest) -> dict:
        user = None
        if payload.target_user_id:
            user = db.query(User).filter(User.id == payload.target_user_id).first()
        elif payload.target_email:
            user = db.query(User).filter(User.email == payload.target_email).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found for manual top-up",
            )

        amount_decimal = Decimal(payload.amount)
        transaction = WalletService.add_points(
            db=db,
            user_id=user.id,
            amount=amount_decimal,
            description=payload.description or "Пополнение администратором",
            transaction_type=TransactionType.CREDIT,
        )

        return AdminService._serialize_transaction(transaction)

