import pulp
import networkx as nx
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.vulnerability import Vulnerability
from app.models.container import Container
from app.models.patch_plan import PatchPlan, PatchScenario
from app.db.session import SessionLocal
from app.core.config import settings

class PatchOptimizer:
    """Оптимизатор для планирования патчей уязвимостей"""
    
    def __init__(self, time_window: int = 24):
        """
        Инициализация оптимизатора
        
        Args:
            time_window: Окно времени в часах для планирования
        """
        self.time_window = time_window
        self.alpha = settings.ALPHA
        self.beta = settings.BETA
        self.gamma = settings.GAMMA
        self.db = SessionLocal()
    
    def generate_plan(self, container_ids: Optional[List[str]] = None, max_items: Optional[int] = None) -> Dict[str, Any]:
        """
        Генерация оптимального плана патчинга
        
        Args:
            container_ids: Список ID контейнеров для планирования (None = все)
            max_items: Максимальное количество задач в плане
            
        Returns:
            Словарь с планом патчинга
        """
        try:
            # Получение данных о контейнерах и уязвимостях
            vulnerabilities = self._get_vulnerabilities(container_ids)
            
            if not vulnerabilities:
                return {"tasks": [], "total_score": 0, "total_duration": 0}
            
            # Создание графа контейнерной сети для анализа
            container_graph = self._build_container_graph(container_ids)
            
            # Подготовка данных для оптимизатора
            items = self._prepare_items(vulnerabilities, container_graph)
            
            # Запуск оптимизации на основе knapsack problem
            selected_items = self._optimize_plan(items, max_items)
            
            # Формирование временного плана
            schedule = self._create_schedule(selected_items)
            
            # Расчет итоговых метрик
            total_score = sum(item["score"] for item in selected_items)
            total_duration = sum(item["duration"] for item in selected_items)
            
            # Сохранение плана в БД
            self._save_plan_to_db(schedule)
            
            return {
                "tasks": schedule,
                "total_score": total_score,
                "total_duration": total_duration
            }
        
        finally:
            self.db.close()
    
    def _get_vulnerabilities(self, container_ids: Optional[List[str]]) -> List[Dict[str, Any]]:
        """
        Получение списка уязвимостей для планирования
        
        Args:
            container_ids: Список ID контейнеров (None = все)
            
        Returns:
            Список словарей с данными об уязвимостях
        """
        # Запрос уязвимостей из БД
        query = (
            self.db.query(
                Vulnerability,
                Container.name.label("container_name"),
                Container.image.label("container_image")
            )
            .join(Container, Vulnerability.container_id == Container.id)
            .order_by(desc(Vulnerability.score))
        )
        
        # Фильтрация по контейнерам, если указано
        if container_ids:
            query = query.filter(Vulnerability.container_id.in_(container_ids))
        
        results = query.all()
        
        # Преобразование в список словарей
        vulnerabilities = []
        for vuln, container_name, container_image in results:
            vulnerabilities.append({
                "id": vuln.id,
                "container_id": vuln.container_id,
                "container_name": container_name,
                "container_image": container_image,
                "cve_id": vuln.cve_id,
                "package_name": vuln.package_name,
                "package_version": vuln.package_version,
                "severity": vuln.severity,
                "score": vuln.score,
                "cvss": vuln.cvss
            })
        
        return vulnerabilities
    
    def _build_container_graph(self, container_ids: Optional[List[str]]) -> nx.Graph:
        """
        Построение графа контейнерной сети для анализа
        
        Args:
            container_ids: Список ID контейнеров (None = все)
            
        Returns:
            Граф контейнеров
        """
        # Создание графа
        G = nx.Graph()
        
        # Запрос контейнеров из БД
        query = self.db.query(Container)
        if container_ids:
            query = query.filter(Container.id.in_(container_ids))
        
        containers = query.all()
        
        # Добавление узлов (контейнеров)
        for container in containers:
            G.add_node(
                container.id, 
                name=container.name,
                image=container.image,
                status=container.status
            )
        
        # Добавление ребер на основе связей (например, из одной сети)
        # Упрощенная демонстрация - связываем контейнеры на одном образе
        container_by_image = {}
        for container in containers:
            if container.image not in container_by_image:
                container_by_image[container.image] = []
            container_by_image[container.image].append(container.id)
        
        for image, container_list in container_by_image.items():
            if len(container_list) > 1:
                for i in range(len(container_list)):
                    for j in range(i+1, len(container_list)):
                        G.add_edge(container_list[i], container_list[j], relationship="same_image")
        
        # Расчет метрик центральности
        if len(G.nodes) > 0:
            centrality = nx.betweenness_centrality(G)
            nx.set_node_attributes(G, centrality, "centrality")
            
            pagerank = nx.pagerank(G)
            nx.set_node_attributes(G, pagerank, "pagerank")
        
        return G
    
    def _prepare_items(self, vulnerabilities: List[Dict[str, Any]], container_graph: nx.Graph) -> List[Dict[str, Any]]:
        """
        Подготовка элементов для задачи оптимизации
        
        Args:
            vulnerabilities: Список уязвимостей
            container_graph: Граф контейнерной сети
            
        Returns:
            Список элементов для оптимизации
        """
        items = []
        
        for vuln in vulnerabilities:
            # Определение сценария патчинга на основе критичности
            scenario = self._determine_patch_scenario(vuln["severity"], vuln["score"])
            
            # Определение длительности операции
            duration = self._estimate_patch_duration(scenario, vuln["container_id"], container_graph)
            
            # Определение приоритета на основе скора и метрик графа
            priority = self._calculate_priority(vuln, container_graph)
            
            items.append({
                "id": vuln["id"],
                "container_id": vuln["container_id"],
                "container_name": vuln["container_name"],
                "vulnerability_id": vuln["cve_id"],
                "score": vuln["score"],
                "severity": vuln["severity"],
                "scenario": scenario,
                "duration": duration,
                "priority": priority
            })
        
        return items
    
    def _determine_patch_scenario(self, severity: str, score: float) -> PatchScenario:
        """
        Определение оптимального сценария патчинга
        
        Args:
            severity: Критичность уязвимости
            score: Скор уязвимости
            
        Returns:
            Сценарий патчинга
        """
        if severity == "Critical" or score > 8.0:
            return PatchScenario.HOT_PATCH
        elif severity == "High" or score > 6.0:
            return PatchScenario.ROLLING_UPDATE
        else:
            return PatchScenario.BLUE_GREEN
    
    def _estimate_patch_duration(self, scenario: PatchScenario, container_id: str, container_graph: nx.Graph) -> int:
        """
        Оценка длительности операции патчинга
        
        Args:
            scenario: Сценарий патчинга
            container_id: ID контейнера
            container_graph: Граф контейнерной сети
            
        Returns:
            Длительность в минутах
        """
        # Базовая длительность в зависимости от сценария
        base_duration = {
            PatchScenario.HOT_PATCH: 10,
            PatchScenario.ROLLING_UPDATE: 20,
            PatchScenario.BLUE_GREEN: 30
        }
        
        # Корректировка на основе метрик центральности контейнера
        multiplier = 1.0
        if container_id in container_graph:
            centrality = container_graph.nodes[container_id].get("centrality", 0)
            pagerank = container_graph.nodes[container_id].get("pagerank", 0)
            
            # Чем более центральный узел, тем дольше патчинг
            multiplier += centrality * 2 + pagerank * 3
        
        return int(base_duration[scenario] * multiplier)
    
    def _calculate_priority(self, vulnerability: Dict[str, Any], container_graph: nx.Graph) -> float:
        """
        Расчет приоритета патчинга
        
        Args:
            vulnerability: Данные уязвимости
            container_graph: Граф контейнерной сети
            
        Returns:
            Приоритет (чем выше, тем важнее)
        """
        # Базовый приоритет на основе скора
        priority = vulnerability["score"]
        
        # Корректировка на основе метрик графа
        if vulnerability["container_id"] in container_graph:
            centrality = container_graph.nodes[vulnerability["container_id"]].get("centrality", 0)
            pagerank = container_graph.nodes[vulnerability["container_id"]].get("pagerank", 0)
            
            # Учет "важности" контейнера в сети
            priority *= (1 + centrality + pagerank)
        
        return priority
    
    def _optimize_plan(self, items: List[Dict[str, Any]], max_items: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Решение задачи оптимизации для выбора патчей
        
        Args:
            items: Список элементов для оптимизации
            max_items: Максимальное количество задач
            
        Returns:
            Список выбранных элементов
        """
        # Если нет элементов, возвращаем пустой список
        if not items:
            return []
        
        # Ограничение по времени (в минутах)
        time_limit = self.time_window * 60
        
        # Создание задачи оптимизации
        problem = pulp.LpProblem("PatchOptimization", pulp.LpMaximize)
        
        # Создание переменных для каждого элемента (1 = выбран, 0 = не выбран)
        x = {}
        for i, item in enumerate(items):
            x[i] = pulp.LpVariable(f"x_{i}", cat=pulp.LpBinary)
        
        # Целевая функция: максимизация суммарного приоритета
        problem += pulp.lpSum([items[i]["priority"] * x[i] for i in range(len(items))])
        
        # Ограничение по времени
        problem += pulp.lpSum([items[i]["duration"] * x[i] for i in range(len(items))]) <= time_limit
        
        # Ограничение по количеству задач (если указано)
        if max_items:
            problem += pulp.lpSum([x[i] for i in range(len(items))]) <= max_items
        
        # Решение задачи
        problem.solve(pulp.PULP_CBC_CMD(msg=False))
        
        # Извлечение выбранных элементов
        selected_items = []
        for i in range(len(items)):
            if pulp.value(x[i]) == 1:
                selected_items.append(items[i])
        
        return selected_items
    
    def _create_schedule(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Создание расписания патчинга
        
        Args:
            items: Список выбранных элементов
            
        Returns:
            Список задач с временем начала
        """
        # Сортировка по приоритету (сначала наиболее критичные)
        sorted_items = sorted(items, key=lambda x: x["priority"], reverse=True)
        
        schedule = []
        current_time = datetime.now()
        
        for item in sorted_items:
            # Создание задачи в расписании
            task = {
                "container_id": item["container_id"],
                "container_name": item["container_name"],
                "vulnerability_id": item["vulnerability_id"],
                "score": item["score"],
                "severity": item["severity"],
                "scenario": item["scenario"].value,
                "start": current_time.isoformat(),
                "duration": item["duration"]
            }
            
            schedule.append(task)
            
            # Обновление текущего времени
            current_time += timedelta(minutes=item["duration"])
        
        return schedule
    
    def _save_plan_to_db(self, schedule: List[Dict[str, Any]]) -> None:
        """
        Сохранение плана патчинга в БД
        
        Args:
            schedule: Расписание патчинга
        """
        try:
            for task in schedule:
                # Преобразование строкового представления сценария в Enum
                scenario_value = task["scenario"]
                scenario = next((s for s in PatchScenario if s.value == scenario_value), PatchScenario.HOT_PATCH)
                
                # Создание записи плана
                plan = PatchPlan(
                    container_id=task["container_id"],
                    vulnerability_id=f"{task['container_id']}_{task['vulnerability_id']}",
                    scenario=scenario,
                    start_time=datetime.fromisoformat(task["start"]),
                    duration=task["duration"],
                    priority=task["score"],
                    status="pending"
                )
                
                self.db.add(plan)
            
            self.db.commit()
        
        except Exception as e:
            self.db.rollback()
            raise e 
