from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime

class ContainerBase(BaseModel):
    """Базовая схема контейнера"""
    id: str
    name: str
    image: str
    status: str
    ports: Optional[Dict[str, Any]] = None

class ContainerCreate(ContainerBase):
    """Схема создания контейнера"""
    pass

class ContainerUpdate(ContainerBase):
    """Схема обновления контейнера"""
    pass

class ContainerInDB(ContainerBase):
    """Схема контейнера в БД"""
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ContainerWithVulns(ContainerInDB):
    """Схема контейнера с уязвимостями"""
    vulnerability_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    score: float 

class Container(BaseModel):
    """Схема контейнера для API"""
    id: str
    name: str
    image: str
    status: str
    created_at: str
    uptime: int
    restart_count: int

class ContainerScanResponse(BaseModel):
    """Ответ на запрос сканирования контейнера"""
    container_id: str
    scan_id: str
    status: str 
