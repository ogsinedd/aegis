from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.session import get_db
from app.models.patch_plan import PatchPlan
from app.models.container import Container
from app.models.vulnerability import Vulnerability
from app.schemas.plan import PlanRequest, PlanResponse, PatchPlanWithDetails
from app.planner.optimizer import PatchOptimizer

router = APIRouter()

@router.get("/", response_model=PlanResponse)
async def generate_plan(
    window: int = Query(24, description="Временное окно для планирования в часах"),
    container_id: Optional[List[str]] = Query(None, description="ID контейнеров для включения в план (опционально)"),
    max_items: Optional[int] = Query(None, description="Максимальное количество задач в плане (опционально)"),
    db: Session = Depends(get_db)
):
    """
    Генерация оптимального плана патчинга уязвимостей
    
    - window: Временное окно планирования в часах (по умолчанию 24 часа)
    - container_id: Список ID контейнеров для включения в план (опционально)
    - max_items: Максимальное количество задач в плане (опционально)
    """
    # Создание оптимизатора
    optimizer = PatchOptimizer(time_window=window)
    
    # Генерация плана
    plan = optimizer.generate_plan(container_ids=container_id, max_items=max_items)
    
    return plan

@router.get("/status", response_model=List[PatchPlanWithDetails])
async def get_plan_status(
    status: Optional[str] = Query(None, description="Фильтр по статусу (pending, in_progress, completed, failed)"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Получение информации о текущем плане патчинга и его статусе
    
    - status: Фильтр по статусу
    """
    # Запрос с join для получения данных о контейнерах и уязвимостях
    query = (
        db.query(
            PatchPlan,
            Container.name.label("container_name"),
            Container.image.label("container_image"),
            Vulnerability.cve_id.label("vulnerability_cve"),
            Vulnerability.severity.label("vulnerability_severity"),
            Vulnerability.score.label("vulnerability_score")
        )
        .join(Container, PatchPlan.container_id == Container.id)
        .join(Vulnerability, PatchPlan.vulnerability_id == Vulnerability.id)
        .order_by(desc(PatchPlan.priority))
    )
    
    # Фильтрация по статусу
    if status:
        query = query.filter(PatchPlan.status == status)
    
    # Добавление пагинации
    results = query.offset(skip).limit(limit).all()
    
    # Формирование результата
    return [
        PatchPlanWithDetails(
            **{
                **plan.__dict__,
                "container_name": container_name,
                "container_image": container_image,
                "vulnerability_cve": vulnerability_cve,
                "vulnerability_severity": vulnerability_severity,
                "vulnerability_score": vulnerability_score
            }
        )
        for plan, container_name, container_image, vulnerability_cve, vulnerability_severity, vulnerability_score in results
    ] 
