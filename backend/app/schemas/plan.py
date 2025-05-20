from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.patch_plan import PatchScenario

class PatchPlanBase(BaseModel):
    """Базовая схема плана патчинга"""
    container_id: str
    vulnerability_id: str
    scenario: PatchScenario
    start_time: datetime
    duration: int
    priority: float

class PatchPlanCreate(PatchPlanBase):
    """Схема создания плана патчинга"""
    pass

class PatchPlanUpdate(BaseModel):
    """Схема обновления плана патчинга"""
    scenario: Optional[PatchScenario] = None
    start_time: Optional[datetime] = None
    duration: Optional[int] = None
    priority: Optional[float] = None
    status: Optional[str] = None

class PatchPlanInDB(PatchPlanBase):
    """Схема плана патчинга в БД"""
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PatchPlanWithDetails(PatchPlanInDB):
    """Схема плана патчинга с дополнительными данными"""
    container_name: str
    container_image: str
    vulnerability_cve: str
    vulnerability_severity: str
    vulnerability_score: float

class PlanRequest(BaseModel):
    """Запрос на генерацию плана патчинга"""
    window: int = 24  # Часовое окно для планирования
    containers: Optional[List[str]] = None  # ID контейнеров (None = все)
    max_items: Optional[int] = None  # Максимальное число задач

class PlanResponse(BaseModel):
    """Ответ с планом патчинга"""
    tasks: List[Dict[str, Any]]
    total_score: float
    total_duration: int 
