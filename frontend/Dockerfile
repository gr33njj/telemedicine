FROM node:18-alpine

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm install

# Копирование приложения
COPY . .

# Открытие порта
EXPOSE 3000

# Команда запуска
CMD ["npm", "start"]

