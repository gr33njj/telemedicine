from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.common.database import engine, Base
import structlog

# Создание таблиц
Base.metadata.create_all(bind=engine)

# Настройка логирования
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

app = FastAPI(
    title="DocLink API",
    description="API для сервиса телемедицины DocLink",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    logger.info("DocLink API starting up")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("DocLink API shutting down")


@app.get("/")
async def root():
    return {"message": "DocLink API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Импорт роутеров
from app.auth.routes import router as auth_router
from app.users.routes import router as users_router
from app.doctors.routes import router as doctors_router
from app.schedule.routes import router as schedule_router
from app.consultations.routes import router as consultations_router
from app.wallet.routes import router as wallet_router
from app.payments.routes import router as payments_router
from app.emr.routes import router as emr_router
from app.admin.routes import router as admin_router
from app.withdrawals.routes import router as withdrawals_router

# Подключение роутеров
app.include_router(auth_router, prefix=settings.API_V1_PREFIX, tags=["Auth"])
app.include_router(users_router, prefix=settings.API_V1_PREFIX, tags=["Users"])
app.include_router(doctors_router, prefix=settings.API_V1_PREFIX, tags=["Doctors"])
app.include_router(schedule_router, prefix=settings.API_V1_PREFIX, tags=["Schedule"])
app.include_router(consultations_router, prefix=settings.API_V1_PREFIX)
app.include_router(wallet_router, prefix=settings.API_V1_PREFIX, tags=["Wallet"])
app.include_router(payments_router, prefix=settings.API_V1_PREFIX, tags=["Payments"])
app.include_router(emr_router, prefix=settings.API_V1_PREFIX, tags=["EMR"])
app.include_router(admin_router, prefix=settings.API_V1_PREFIX, tags=["Admin"])
app.include_router(withdrawals_router, prefix=settings.API_V1_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Unhandled exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

