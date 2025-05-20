from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HookBase(BaseModel):
    """Базовая схема хука"""
    name: str
    type: str
    script: str
    enabled: bool = True

class HookCreate(HookBase):
    """Схема создания хука"""
    pass

class HookUpdate(BaseModel):
    """Схема обновления хука"""
    name: Optional[str] = None
    type: Optional[str] = None
    script: Optional[str] = None
    enabled: Optional[bool] = None

class HookInDB(HookBase):
    """Схема хука в БД"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True 
