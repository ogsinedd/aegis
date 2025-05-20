FROM node:20-slim

# Рабочая директория
WORKDIR /app

# Установка зависимостей
COPY package.json ./
RUN npm install

# Копирование исходников
COPY . .

# Экспозиция порта для Vite
EXPOSE 3000

# Запуск сервера разработки
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 
