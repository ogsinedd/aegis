from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Создание движка SQLAlchemy
engine = create_engine(settings.DATABASE_URL)

# Фабрика сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()

def get_db():
    """Функция-провайдер для получения сессии БД"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Создание всех таблиц в БД"""
    Base.metadata.create_all(bind=engine) 
