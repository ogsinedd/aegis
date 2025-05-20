from sqlalchemy import Column, String, DateTime, Integer, Float, ForeignKey, Enum
from sqlalchemy.sql import func
import enum
from app.db.session import Base

class PatchScenario(enum.Enum):
    HOT_PATCH = "hot-patch"
    ROLLING_UPDATE = "rolling-update"
    BLUE_GREEN = "blue-green"

class PatchPlan(Base):
    """Модель плана патчинга контейнеров"""
    __tablename__ = "patch_plans"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    container_id = Column(String, ForeignKey("containers.id", ondelete="CASCADE"), index=True)
    vulnerability_id = Column(String, ForeignKey("vulnerabilities.id", ondelete="CASCADE"), index=True)
    scenario = Column(Enum(PatchScenario), default=PatchScenario.HOT_PATCH)
    start_time = Column(DateTime)
    duration = Column(Integer)  # в минутах
    priority = Column(Float)
    status = Column(String, default="pending")  # pending, in_progress, completed, failed
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<PatchPlan for {self.container_id}, vuln: {self.vulnerability_id}>" 
