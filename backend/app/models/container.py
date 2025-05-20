from sqlalchemy import Column, String, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from app.db.session import Base

class Container(Base):
    """Модель Docker-контейнера"""
    __tablename__ = "containers"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    image = Column(String)
    status = Column(String)
    ports = Column(JSON)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Container {self.name} ({self.id})>" 
