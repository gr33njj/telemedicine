# DocLink - Сервис телемедицины

Полнофункциональный сервис телемедицины с поддержкой видеоконсультаций, электронной медкарты и системой оплаты поинтами.

## Архитектура

- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript
- **База данных**: PostgreSQL
- **Хранилище файлов**: MinIO (S3-совместимое)
- **Кэш**: Redis

## Структура проекта

```
doclink/
├── backend/          # FastAPI приложение
│   ├── app/
│   │   ├── auth/     # Модуль аутентификации
│   │   ├── users/    # Модуль пользователей
│   │   ├── doctors/  # Модуль врачей
│   │   ├── schedule/ # Модуль расписания
│   │   ├── consultations/ # Модуль консультаций
│   │   ├── wallet/   # Модуль кошелька
│   │   ├── payments/ # Модуль платежей
│   │   ├── emr/      # Модуль ЭМК
│   │   ├── notifications/ # Модуль уведомлений
│   │   ├── admin/    # Модуль админ-панели
│   │   └── common/   # Общие модули
│   └── migrations/   # Миграции Alembic
├── frontend/         # React приложение
└── docker-compose.yml # Docker Compose конфигурация
```

## Быстрый старт

### Требования

- Docker и Docker Compose
- Python 3.11+ (для локальной разработки)
- Node.js 18+ (для локальной разработки)

### Запуск через Docker Compose

1. Клонируйте репозиторий или скопируйте проект

2. Создайте файл `.env` в директории `backend/`:

```bash
cd backend
cp .env.example .env
# Отредактируйте .env файл с вашими настройками
```

3. Запустите проект:

```bash
docker-compose up -d
```

4. Примените миграции:

```bash
docker-compose exec backend alembic upgrade head
```

5. Откройте в браузере:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Документация: http://localhost:8000/api/docs
   - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

## API Документация

После запуска проекта документация API доступна по адресу:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Основные модули

### 1. Аутентификация (Auth)
- Регистрация пользователей
- Авторизация через JWT
- Обновление токенов
- Подтверждение email

### 2. Пользователи (Users)
- Профили пациентов
- Медицинские файлы
- Управление данными

### 3. Врачи (Doctors)
- Профили врачей
- Сертификаты и документы
- Верификация администратором

### 4. Расписание (Schedule)
- Создание слотов расписания
- Резервация слотов
- Поиск доступных слотов

### 5. Консультации (Consultations)
- Создание консультаций
- WebRTC видеосвязь
- Текстовый чат
- Обмен файлами
- Управление статусами

### 6. Кошелек (Wallet)
- Баланс поинтов
- История транзакций
- Заморозка/разморозка поинтов

### 7. Платежи (Payments)
- Интеграция с Stripe
- Покупка поинтов
- Поддержка валют (RUB, USD, EUR)

### 8. ЭМК (EMR)
- Создание записей
- История консультаций
- Доступ по ролям

### 9. Админ-панель (Admin)
- Управление пользователями
- Модерация врачей
- Статистика
- Настройка курсов обмена

## Роли пользователей

- **patient** - Пациент
- **doctor** - Врач
- **admin** - Администратор

## Разработка

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Миграции

```bash
# Создать новую миграцию
alembic revision --autogenerate -m "Description"

# Применить миграции
alembic upgrade head

# Откатить миграцию
alembic downgrade -1
```

## Переменные окружения

Основные переменные окружения (см. `backend/.env.example`):

- `DATABASE_URL` - URL базы данных PostgreSQL
- `SECRET_KEY` - Секретный ключ для JWT
- `S3_ENDPOINT_URL` - URL MinIO/S3
- `STRIPE_SECRET_KEY` - Ключ Stripe API
- `POINTS_EXCHANGE_RATE_RUB/USD/EUR` - Курсы обмена валют

## Лицензия

Проект создан для демонстрации возможностей телемедицины.

## Контакты

Домен: doclink.it-mydoc.ru
IP: 147.45.186.79

