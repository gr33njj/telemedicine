from datetime import datetime
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.orm import Session, joinedload
import structlog

from app.common.database import SessionLocal, get_db
from app.common.dependencies import (
    TokenValidationError,
    get_current_user,
    get_user_by_token,
)
from app.common.models import (
    Consultation,
    ConsultationStatus,
    DoctorProfile,
    PatientProfile,
    User,
    UserRole,
)
from app.services.consultation_service import ConsultationService
from app.consultations.connection_manager import (
    ConsultationConnection,
    manager,
)
from app.consultations import schemas

router = APIRouter(tags=["consultations"])
logger = structlog.get_logger()


def _format_name(profile: Optional[object], fallback: str, email: str) -> str:
    if not profile:
        return fallback or email
    parts = [getattr(profile, "first_name", None), getattr(profile, "last_name", None)]
    name = " ".join(filter(None, parts)).strip()
    return name or fallback or email


def _get_consultation_details(db: Session, consultation_id: int) -> Consultation:
    consultation = (
        db.query(Consultation)
        .options(joinedload(Consultation.slot))
        .filter(Consultation.id == consultation_id)
        .first()
    )
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Консультация не найдена",
        )
    return consultation


def _ensure_participant(
    db: Session,
    consultation: Consultation,
    user: User,
) -> str:
    """Возвращает participant_type (doctor/patient) если пользователь участник."""
    if user.role == UserRole.DOCTOR:
        doctor_profile = (
            db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
        )
        if doctor_profile and doctor_profile.id == consultation.doctor_id:
            return "doctor"
    elif user.role == UserRole.PATIENT:
        patient_profile = (
            db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()
        )
        if patient_profile and patient_profile.id == consultation.patient_id:
            return "patient"
    elif user.role == UserRole.ADMIN:
        return "admin"

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Нет доступа к консультации",
    )


@router.post("/consultations/book", response_model=schemas.ConsultationResponse)
def book_consultation(
    booking: schemas.BookConsultationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Забронировать консультацию"""
    patient_profile = (
        db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    )
    if not patient_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    doctor_profile = (
        db.query(DoctorProfile).filter(DoctorProfile.id == booking.doctor_id).first()
    )
    if not doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found",
        )

    if not doctor_profile.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor profile has not been approved yet",
        )

    try:
        consultation = ConsultationService.book_consultation(
            db,
            patient_id=patient_profile.id,
            doctor_id=doctor_profile.id,
            slot_id=booking.slot_id,
            points_cost=booking.points_cost
        )
        return schemas.ConsultationResponse.from_orm(consultation)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/consultations/{consultation_id}/start", response_model=schemas.ConsultationResponse)
def start_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Начать консультацию"""
    try:
        consultation = ConsultationService.start_consultation(db, consultation_id)
        return schemas.ConsultationResponse.from_orm(consultation)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/consultations/{consultation_id}/complete", response_model=schemas.ConsultationResponse)
def complete_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Завершить консультацию"""
    try:
        consultation = ConsultationService.complete_consultation(db, consultation_id)
        return schemas.ConsultationResponse.from_orm(consultation)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/consultations/{consultation_id}/cancel", response_model=schemas.ConsultationResponse)
def cancel_consultation(
    consultation_id: int,
    cancel_request: schemas.CancelConsultationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отменить консультацию"""
    try:
        consultation = ConsultationService.cancel_consultation(
            db, 
            consultation_id,
            reason=cancel_request.reason
        )
        return schemas.ConsultationResponse.from_orm(consultation)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/consultations/history", response_model=List[schemas.ConsultationResponse])
def get_consultation_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 20
):
    """Получить историю консультаций"""
    consultations = ConsultationService.get_consultation_history(
        db,
        current_user.id,
        current_user.role.value,
        limit
    )

    doctor_ids = {consultation.doctor_id for consultation in consultations}
    patient_ids = {consultation.patient_id for consultation in consultations}

    doctor_profiles = {
        profile.id: profile
        for profile in db.query(DoctorProfile).filter(DoctorProfile.id.in_(doctor_ids))  # type: ignore[arg-type]
    } if doctor_ids else {}
    patient_profiles = {
        profile.id: profile
        for profile in db.query(PatientProfile).filter(PatientProfile.id.in_(patient_ids))  # type: ignore[arg-type]
    } if patient_ids else {}

    def compose_name(first_name: Optional[str], last_name: Optional[str], fallback: str) -> str:
        parts = [first_name or "", last_name or ""]
        name = " ".join(part.strip() for part in parts if part.strip())
        return name or fallback

    responses: List[schemas.ConsultationResponse] = []
    for consultation in consultations:
        base = schemas.ConsultationResponse.from_orm(consultation).model_dump()
        doctor_profile = doctor_profiles.get(consultation.doctor_id)
        patient_profile = patient_profiles.get(consultation.patient_id)
        slot = consultation.slot

        base["doctor_name"] = compose_name(
            getattr(doctor_profile, "first_name", None),
            getattr(doctor_profile, "last_name", None),
            "Врач",
        )
        base["patient_name"] = compose_name(
            getattr(patient_profile, "first_name", None),
            getattr(patient_profile, "last_name", None),
            "Пациент",
        )
        base["doctor_specialty"] = getattr(doctor_profile, "specialty", None)
        base["slot_start_time"] = slot.start_time if slot else None
        base["slot_end_time"] = slot.end_time if slot else None

        responses.append(schemas.ConsultationResponse(**base))

    return responses


@router.get("/consultations/{consultation_id}", response_model=schemas.ConsultationDetailResponse)
def get_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить информацию о консультации"""
    consultation = _get_consultation_details(db, consultation_id)
    participant_type = _ensure_participant(db, consultation, current_user)

    doctor_profile = db.query(DoctorProfile).filter(
        DoctorProfile.id == consultation.doctor_id
    ).first()
    patient_profile = db.query(PatientProfile).filter(
        PatientProfile.id == consultation.patient_id
    ).first()

    base_data = schemas.ConsultationResponse.from_orm(consultation).model_dump()
    slot_start = consultation.slot.start_time if consultation.slot else None
    slot_end = consultation.slot.end_time if consultation.slot else None

    return schemas.ConsultationDetailResponse(
        **base_data,
        doctor_name=_format_name(doctor_profile, "Врач", current_user.email),
        patient_name=_format_name(patient_profile, "Пациент", current_user.email),
        slot_start_time=slot_start,
        slot_end_time=slot_end,
    )


@router.websocket("/ws/consultations/{consultation_id}")
async def consultations_websocket_endpoint(
    websocket: WebSocket,
    consultation_id: int,
    token: Optional[str] = Query(default=None),
):
    if not token:
        await websocket.close(code=4401, reason="Missing token")
        return

    db = SessionLocal()
    connection: Optional[ConsultationConnection] = None
    try:
        try:
            user = get_user_by_token(db, token)
        except TokenValidationError as exc:
            await websocket.close(code=4401, reason=str(exc))
            db.close()
            return

        consultation = _get_consultation_details(db, consultation_id)
        try:
            participant_type = _ensure_participant(db, consultation, user)
        except HTTPException as exc:
            await websocket.close(code=4403, reason=exc.detail)
            db.close()
            return

        if participant_type == "doctor":
            profile = (
                db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
            )
        elif participant_type == "patient":
            profile = (
                db.query(PatientProfile)
                .filter(PatientProfile.user_id == user.id)
                .first()
            )
        else:
            profile = None

        display_name = _format_name(profile, user.email.split("@")[0], user.email)

        connection = ConsultationConnection(
            consultation_id=consultation_id,
            websocket=websocket,
            user_id=user.id,
            user_role=user.role.value,
            participant_type=participant_type,
            display_name=display_name,
        )

        await websocket.accept()
        room_snapshot = await manager.register(connection)

        await manager.send_personal_message(
            connection,
            {
                "type": "system",
                "event": "connected",
                "payload": {
                    "userId": user.id,
                    "role": participant_type,
                    "displayName": display_name,
                    "roomSize": len(room_snapshot),
                },
            },
        )

        should_create_offer = len(room_snapshot) > 1
        await manager.send_personal_message(
            connection,
            {
                "type": "system",
                "event": "ready",
                "payload": {"shouldCreateOffer": should_create_offer},
            },
        )

        await manager.broadcast(
            consultation_id,
            {
                "type": "system",
                "event": "peer_joined",
                "payload": {
                    "userId": user.id,
                    "displayName": display_name,
                    "role": participant_type,
                },
            },
            exclude_user_id=connection.user_id,
        )

        if should_create_offer:
            try:
                ConsultationService.start_consultation(db, consultation_id)
            except ValueError:
                pass

        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            payload = data.get("payload", {})

            if message_type in {"offer", "answer", "ice"}:
                await manager.broadcast(
                    consultation_id,
                    {
                        "type": message_type,
                        "payload": payload,
                        "senderId": connection.user_id,
                        "senderRole": connection.participant_type,
                    },
                    exclude_user_id=connection.user_id,
                )
            elif message_type == "chat":
                text = (payload or {}).get("text", "").strip()
                if text:
                    await manager.broadcast(
                        consultation_id,
                        {
                            "type": "chat",
                            "payload": {
                                "text": text,
                                "senderId": connection.user_id,
                                "senderName": connection.display_name,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        },
                    )
            elif message_type == "media":
                await manager.broadcast(
                    consultation_id,
                    {
                        "type": "media",
                        "payload": {
                            **payload,
                            "senderId": connection.user_id,
                        },
                    },
                    exclude_user_id=connection.user_id,
                )
            elif message_type == "end-call":
                await manager.broadcast(
                    consultation_id,
                    {
                        "type": "system",
                        "event": "call_ended",
                        "payload": {"by": connection.user_id},
                    },
                )
                try:
                    ConsultationService.complete_consultation(db, consultation_id)
                except ValueError:
                    pass
            else:
                logger.warning("Unsupported websocket message", type=message_type)

    except WebSocketDisconnect:
        if connection:
            await manager.broadcast(
                consultation_id,
                {
                    "type": "system",
                    "event": "peer_left",
                    "payload": {"userId": connection.user_id},
                },
                exclude_user_id=connection.user_id,
            )
    except Exception as exc:
        logger.error(
            "Consultation websocket error",
            consultation_id=consultation_id,
            user_id=user.id if "user" in locals() else None,
            error=str(exc),
        )
        await websocket.close(code=1011, reason="Server error")
    finally:
        if connection:
            await manager.unregister(connection)
        db.close()
