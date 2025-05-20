import asyncio
import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import settings
from app.api.api import api_router
from app.services.collector import ContainerCollector
from app.db.session import create_tables

app = FastAPI(
    title="Helix",
    description="Система управления уязвимостями в Docker-контейнерах",
    version="0.1.0",
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Подключение API роутера
app.include_router(api_router, prefix="/v1")

# Обработчик состояния здоровья системы
@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok"}

# Глобальный экземпляр коллектора
collector = None

@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске сервера"""
    print(f"Starting server with DEV_MODE={settings.DEV_MODE}")
    
    # Создание таблиц в БД
    create_tables()
    
    # Пропускаем инициализацию коллектора в режиме разработки
    if settings.DEV_MODE:
        print("Running in DEV_MODE without collector")
        return
    
    # Запуск коллектора в фоновом режиме
    global collector
    collector = ContainerCollector(
        docker_socket=settings.DOCKER_SOCKET,
        scan_interval=settings.SCAN_INTERVAL,
        scanner=settings.SCANNER
    )
    asyncio.create_task(collector.start())

@app.on_event("shutdown")
async def shutdown_event():
    """Освобождение ресурсов при остановке сервера"""
    global collector
    if collector:
        await collector.stop()

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.DEV_MODE) 
