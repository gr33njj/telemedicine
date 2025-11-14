# Быстрый старт DocLink

## Шаг 1: Подготовка окружения

1. Убедитесь, что установлены Docker и Docker Compose
2. Перейдите в директорию проекта:
```bash
cd /opt/projects/doclink
```

## Шаг 2: Настройка переменных окружения

Создайте файл `.env` в директории `backend/`:

```bash
cd backend
cp .env.example .env
```

Отредактируйте `.env` файл, установив необходимые значения:
- `SECRET_KEY` - сгенерируйте случайную строку (можно использовать `openssl rand -hex 32`)
- `DATABASE_URL` - URL базы данных (по умолчанию настроен для Docker)
- Настройки платежных систем (опционально)

## Шаг 3: Запуск через Docker Compose

```bash
cd /opt/projects/doclink
docker-compose up -d
```

Это запустит:
- PostgreSQL базу данных
- Redis для кэширования
- MinIO для хранения файлов
- Backend API (FastAPI)
- Frontend (React)

## Шаг 4: Применение миграций

```bash
docker-compose exec backend alembic upgrade head
```

## Шаг 5: Проверка работы

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Документация: http://localhost:8000/api/docs
- MinIO Console: http://localhost:9001 (логин: minioadmin, пароль: minioadmin)

## Шаг 6: Создание первого пользователя

Через API документацию (http://localhost:8000/api/docs) или через frontend:

1. Зарегистрируйте пользователя через `/api/v1/auth/register`
2. Войдите через `/api/v1/auth/login`
3. Создайте профиль пациента/врача

## Создание администратора

Для создания администратора выполните SQL запрос:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

Или через Python:

```python
from app.common.database import SessionLocal
from app.common.models import User, UserRole

db = SessionLocal()
user = db.query(User).filter(User.email == 'your-email@example.com').first()
if user:
    user.role = UserRole.ADMIN
    db.commit()
```

## Остановка сервисов

```bash
docker-compose down
```

Для удаления всех данных (включая базу данных):

```bash
docker-compose down -v
```

## Логи

Просмотр логов всех сервисов:
```bash
docker-compose logs -f
```

Просмотр логов конкретного сервиса:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Разработка

### Backend (локально)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (локально)

```bash
cd frontend
npm install
npm start
```

## Проблемы и решения

### Порт уже занят
Измените порты в `docker-compose.yml` или остановите конфликтующие сервисы.

### Ошибки подключения к базе данных
Убедитесь, что PostgreSQL контейнер запущен:
```bash
docker-compose ps
```

### Ошибки миграций
Проверьте подключение к базе данных и убедитесь, что все зависимости установлены.

## Дополнительная информация

См. основной README.md для подробной документации.

