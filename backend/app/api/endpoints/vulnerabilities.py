from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.session import get_db
from app.models.vulnerability import Vulnerability
from app.models.container import Container
from app.schemas.vulnerability import VulnerabilityInDB, VulnerabilityWithContainer

router = APIRouter()

@router.get("/", response_model=List[VulnerabilityWithContainer])
async def get_vulnerabilities(
    container_id: Optional[str] = None,
    severity: Optional[str] = None,
    cve_id: Optional[str] = None,
    min_cvss: Optional[float] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Получение списка уязвимостей с возможностью фильтрации
    
    - container_id: фильтр по ID контейнера
    - severity: фильтр по критичности (Critical, High, Medium, Low)
    - cve_id: фильтр по CVE идентификатору (например, CVE-2021-...)
    - min_cvss: минимальный CVSS score
    """
    # Запрос с join для получения данных о контейнере
    query = (
        db.query(Vulnerability, Container.name.label("container_name"), Container.image.label("container_image"))
        .join(Container, Vulnerability.container_id == Container.id)
    )
    
    # Применение фильтров
    if container_id:
        query = query.filter(Vulnerability.container_id == container_id)
    
    if severity:
        query = query.filter(Vulnerability.severity == severity)
    
    if cve_id:
        query = query.filter(Vulnerability.cve_id.ilike(f"%{cve_id}%"))
    
    if min_cvss is not None:
        query = query.filter(Vulnerability.cvss >= min_cvss)
    
    # Сортировка по скору (наиболее опасные первыми)
    query = query.order_by(desc(Vulnerability.score))
    
    # Добавление пагинации
    results = query.offset(skip).limit(limit).all()
    
    # Формирование результата
    return [
        VulnerabilityWithContainer(
            **{**vulnerability.__dict__, "container_name": container_name, "container_image": container_image}
        )
        for vulnerability, container_name, container_image in results
    ]

@router.get("/{vuln_id}", response_model=VulnerabilityWithContainer)
async def get_vulnerability(
    vuln_id: str,
    db: Session = Depends(get_db)
):
    """Получение детальной информации о конкретной уязвимости"""
    # Запрос с join для получения данных о контейнере
    result = (
        db.query(Vulnerability, Container.name.label("container_name"), Container.image.label("container_image"))
        .join(Container, Vulnerability.container_id == Container.id)
        .filter(Vulnerability.id == vuln_id)
        .first()
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Уязвимость не найдена")
    
    vulnerability, container_name, container_image = result
    
    # Формирование результата
    return VulnerabilityWithContainer(
        **{**vulnerability.__dict__, "container_name": container_name, "container_image": container_image}
    ) 
