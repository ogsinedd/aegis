from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer
from sqlalchemy.sql import func
from app.db.session import Base

class Hook(Base):
    """Модель пользовательского скрипта-хука"""
    __tablename__ = "hooks"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, index=True)
    type = Column(String, index=True)  # on_detect, pre_patch, post_patch, on_failure, on_rollback
    script = Column(Text)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Hook {self.name} ({self.type})>" 
