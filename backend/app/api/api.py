from fastapi import APIRouter

from app.api.endpoints import containers, vulnerabilities, plan, hooks

# Основной API роутер
api_router = APIRouter()

# Подключение эндпоинтов
api_router.include_router(containers.router, prefix="/containers", tags=["containers"])
api_router.include_router(vulnerabilities.router, prefix="/vulnerabilities", tags=["vulnerabilities"])
api_router.include_router(plan.router, prefix="/plan", tags=["plan"])
api_router.include_router(hooks.router, prefix="/hooks", tags=["hooks"]) 
