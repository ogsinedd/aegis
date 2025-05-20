FROM python:3.11-slim-bullseye

# Установка системных зависимостей
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Установка Syft и Grype
RUN curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin \
    && curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin

# Копирование и установка зависимостей
COPY requirements.txt .

# Устанавливаем numpy и pandas из предкомпилированных wheel-пакетов
RUN pip install --no-cache-dir \
    numpy==1.24.4 \
    pandas==2.0.3 \
    && pip install --no-cache-dir -r requirements.txt

# Копирование исходного кода
COPY . .

# Порт для FastAPI
EXPOSE 8000

# Запуск приложения
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 
