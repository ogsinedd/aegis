from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.session import get_db
from app.models.hook import Hook
from app.schemas.hook import HookCreate, HookUpdate, HookInDB

router = APIRouter()

@router.get("/", response_model=List[HookInDB])
async def get_hooks(
    type: Optional[str] = None,
    enabled: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Получение списка пользовательских хуков
    
    - type: фильтр по типу хука (on_detect, pre_patch, post_patch, on_failure, on_rollback)
    - enabled: фильтр по статусу (включен/выключен)
    """
    # Базовый запрос
    query = db.query(Hook)
    
    # Применение фильтров
    if type:
        query = query.filter(Hook.type == type)
    
    if enabled is not None:
        query = query.filter(Hook.enabled == enabled)
    
    # Добавление пагинации
    hooks = query.offset(skip).limit(limit).all()
    
    return hooks

@router.post("/", response_model=HookInDB)
async def create_hook(
    hook: HookCreate,
    db: Session = Depends(get_db)
):
    """Создание нового пользовательского хука"""
    # Проверка на существование хука с таким именем
    existing_hook = db.query(Hook).filter(Hook.name == hook.name).first()
    if existing_hook:
        raise HTTPException(status_code=400, detail="Хук с таким именем уже существует")
    
    # Создание объекта хука
    db_hook = Hook(**hook.dict())
    
    # Сохранение в БД
    db.add(db_hook)
    db.commit()
    db.refresh(db_hook)
    
    return db_hook

@router.get("/{hook_id}", response_model=HookInDB)
async def get_hook(
    hook_id: int,
    db: Session = Depends(get_db)
):
    """Получение информации о конкретном хуке"""
    # Поиск хука в БД
    hook = db.query(Hook).filter(Hook.id == hook_id).first()
    
    if not hook:
        raise HTTPException(status_code=404, detail="Хук не найден")
    
    return hook

@router.put("/{hook_id}", response_model=HookInDB)
async def update_hook(
    hook_id: int,
    hook_update: HookUpdate,
    db: Session = Depends(get_db)
):
    """Обновление существующего хука"""
    # Поиск хука в БД
    db_hook = db.query(Hook).filter(Hook.id == hook_id).first()
    
    if not db_hook:
        raise HTTPException(status_code=404, detail="Хук не найден")
    
    # Обновление полей
    update_data = hook_update.dict(exclude_unset=True)
    
    # Проверка на уникальность имени при его изменении
    if "name" in update_data and update_data["name"] != db_hook.name:
        existing = db.query(Hook).filter(Hook.name == update_data["name"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Хук с таким именем уже существует")
    
    # Применение обновлений
    for key, value in update_data.items():
        setattr(db_hook, key, value)
    
    # Сохранение изменений
    db.commit()
    db.refresh(db_hook)
    
    return db_hook

@router.delete("/{hook_id}", response_model=dict)
async def delete_hook(
    hook_id: int,
    db: Session = Depends(get_db)
):
    """Удаление хука"""
    # Поиск хука в БД
    hook = db.query(Hook).filter(Hook.id == hook_id).first()
    
    if not hook:
        raise HTTPException(status_code=404, detail="Хук не найден")
    
    # Удаление хука
    db.delete(hook)
    db.commit()
    
    return {"status": "success", "message": f"Хук {hook.name} успешно удален"} 
