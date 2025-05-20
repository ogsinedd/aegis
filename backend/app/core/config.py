import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Настройки приложения из переменных окружения"""
    # Настройки базы данных
    DATABASE_URL: str = "postgresql://postgres:postgres@aegis-db:5432/aegis"
    
    # Настройки сканирования
    SCAN_INTERVAL: int = 300  # секунды
    DOCKER_SOCKET: str = "/var/run/docker.sock"
    SCANNER: str = "grype"
    
    # Настройки приложения
    DEV_MODE: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Настройки планировщика
    ALPHA: float = 0.6  # Вес CVSS
    BETA: float = 0.3   # Вес Impact Factor
    GAMMA: float = 0.1  # Вес Exploit Probability
    
    # Путь к файлу с хуками
    HOOKS_FILE: str = "/app/hooks.yml"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Глобальный экземпляр настроек
settings = Settings() 
