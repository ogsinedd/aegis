import asyncio
import docker
import json
import subprocess
import os
import tempfile
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from loguru import logger

from app.db.session import SessionLocal
from app.models.container import Container
from app.models.vulnerability import Vulnerability
from app.schemas.container import ContainerCreate
from app.schemas.vulnerability import VulnerabilityCreate
from app.core.config import settings

class ContainerCollector:
    """Сервис для сбора информации о Docker-контейнерах и сканирования уязвимостей"""
    
    def __init__(self, docker_socket: str, scan_interval: int, scanner: str = "grype"):
        """
        Инициализация коллектора
        
        Args:
            docker_socket: Путь к сокету Docker Engine
            scan_interval: Интервал сканирования в секундах
            scanner: Используемый сканер уязвимостей (по умолчанию grype)
        """
        self.docker_socket = docker_socket
        self.scan_interval = scan_interval
        self.scanner = scanner
        self.client = docker.DockerClient(base_url=f"unix://{docker_socket}")
        self.running = False
        logger.info(f"Инициализирован коллектор: интервал={scan_interval}с, сканер={scanner}")
    
    async def start(self) -> None:
        """Запуск процесса сбора информации о контейнерах"""
        self.running = True
        logger.info("Запуск коллектора контейнеров")
        
        while self.running:
            try:
                # Получение списка контейнеров
                containers = self.client.containers.list(all=True)
                logger.info(f"Найдено {len(containers)} контейнеров")
                
                # Обработка каждого контейнера
                for container in containers:
                    await self._process_container(container)
                
            except docker.errors.DockerException as e:
                logger.error(f"Ошибка Docker API: {str(e)}")
            except Exception as e:
                logger.error(f"Неожиданная ошибка: {str(e)}")
            
            # Ожидание следующего цикла
            await asyncio.sleep(self.scan_interval)
    
    async def stop(self) -> None:
        """Остановка процесса сбора"""
        self.running = False
        logger.info("Остановка коллектора контейнеров")
    
    async def _process_container(self, container: Any) -> None:
        """
        Обработка данных контейнера и сканирование уязвимостей
        
        Args:
            container: Объект контейнера из Docker API
        """
        try:
            # Извлечение информации о контейнере
            container_data = self._extract_container_data(container)
            
            # Сохранение данных контейнера в БД
            db_container = self._upsert_container(container_data)
            
            # Если контейнер запущен, сканируем его
            if container.status == "running":
                await self._scan_container(container.image.tags[0] if container.image.tags else container.id, db_container.id)
        
        except Exception as e:
            logger.error(f"Ошибка при обработке контейнера {container.id}: {str(e)}")
    
    def _extract_container_data(self, container: Any) -> Dict[str, Any]:
        """
        Извлечение данных из объекта контейнера
        
        Args:
            container: Объект контейнера из Docker API
            
        Returns:
            Словарь с данными контейнера
        """
        # Извлечение портов
        ports = {}
        if container.ports:
            for port, binding in container.ports.items():
                if binding:
                    ports[port] = binding
        
        # Формирование данных
        return {
            "id": container.id,
            "name": container.name,
            "image": container.image.tags[0] if container.image.tags else container.image.id,
            "status": container.status,
            "ports": ports
        }
    
    def _upsert_container(self, container_data: Dict[str, Any]) -> Container:
        """
        Создание или обновление записи о контейнере в БД
        
        Args:
            container_data: Данные контейнера
            
        Returns:
            Объект контейнера в БД
        """
        db = SessionLocal()
        try:
            # Поиск существующего контейнера
            db_container = db.query(Container).filter(Container.id == container_data["id"]).first()
            
            if db_container:
                # Обновление существующего
                for key, value in container_data.items():
                    setattr(db_container, key, value)
            else:
                # Создание нового
                db_container = Container(**container_data)
                db.add(db_container)
            
            db.commit()
            db.refresh(db_container)
            return db_container
            
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Ошибка при сохранении контейнера в БД: {str(e)}")
            raise
        finally:
            db.close()
    
    async def _scan_container(self, image: str, container_id: str) -> None:
        """
        Сканирование контейнера на наличие уязвимостей
        
        Args:
            image: Образ контейнера
            container_id: ID контейнера в БД
        """
        logger.info(f"Сканирование контейнера {container_id}, образ {image}")
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                sbom_path = os.path.join(temp_dir, "sbom.json")
                
                # Генерация SBOM с помощью Syft
                self._generate_sbom(image, sbom_path)
                
                # Сканирование с помощью Grype
                vulnerabilities = self._scan_with_grype(sbom_path)
                
                # Сохранение результатов
                if vulnerabilities:
                    self._save_vulnerabilities(container_id, vulnerabilities)
        
        except Exception as e:
            logger.error(f"Ошибка при сканировании контейнера {container_id}: {str(e)}")
    
    def _generate_sbom(self, image: str, output_path: str) -> None:
        """
        Генерация SBOM (Software Bill of Materials) с помощью Syft
        
        Args:
            image: Образ для сканирования
            output_path: Путь для сохранения SBOM
        """
        try:
            cmd = ["syft", image, "-o", "spdx-json", "--file", output_path]
            logger.debug(f"Выполнение команды: {' '.join(cmd)}")
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.debug(f"SBOM сгенерирован: {output_path}")
        
        except subprocess.CalledProcessError as e:
            logger.error(f"Ошибка при генерации SBOM: {e.stderr}")
            raise Exception(f"Ошибка Syft: {e.stderr}")
    
    def _scan_with_grype(self, sbom_path: str) -> List[Dict[str, Any]]:
        """
        Сканирование SBOM на уязвимости с помощью Grype
        
        Args:
            sbom_path: Путь к файлу SBOM
            
        Returns:
            Список найденных уязвимостей
        """
        try:
            cmd = ["grype", f"sbom:{sbom_path}", "-o", "json"]
            logger.debug(f"Выполнение команды: {' '.join(cmd)}")
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            # Парсинг результатов
            grype_result = json.loads(result.stdout)
            logger.info(f"Найдено {len(grype_result.get('matches', []))} уязвимостей")
            
            return grype_result.get("matches", [])
        
        except subprocess.CalledProcessError as e:
            logger.error(f"Ошибка при сканировании на уязвимости: {e.stderr}")
            raise Exception(f"Ошибка Grype: {e.stderr}")
        except json.JSONDecodeError as e:
            logger.error(f"Ошибка при парсинге результатов Grype: {str(e)}")
            raise Exception("Некорректный JSON от Grype")
    
    def _save_vulnerabilities(self, container_id: str, vulnerabilities: List[Dict[str, Any]]) -> None:
        """
        Сохранение найденных уязвимостей в БД
        
        Args:
            container_id: ID контейнера
            vulnerabilities: Список уязвимостей
        """
        db = SessionLocal()
        try:
            for vuln in vulnerabilities:
                # Извлечение данных уязвимости
                vulnerability = self._parse_vulnerability(container_id, vuln)
                if not vulnerability:
                    continue
                
                # Поиск существующей уязвимости
                db_vuln = db.query(Vulnerability).filter(Vulnerability.id == vulnerability["id"]).first()
                
                if db_vuln:
                    # Обновление существующей
                    for key, value in vulnerability.items():
                        if key != "id":
                            setattr(db_vuln, key, value)
                else:
                    # Создание новой
                    db_vuln = Vulnerability(**vulnerability)
                    db.add(db_vuln)
            
            db.commit()
        
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Ошибка при сохранении уязвимостей в БД: {str(e)}")
        finally:
            db.close()
    
    def _parse_vulnerability(self, container_id: str, vuln_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Парсинг данных уязвимости из отчета Grype
        
        Args:
            container_id: ID контейнера
            vuln_data: Данные уязвимости из Grype
            
        Returns:
            Словарь с данными для сохранения в БД или None
        """
        try:
            # Извлечение CVE ID
            cve_id = vuln_data.get("vulnerability", {}).get("id", "")
            if not cve_id:
                return None
            
            # Формирование ID: {container_id}_{CVE}
            vuln_id = f"{container_id}_{cve_id}"
            
            # Базовые данные
            package = vuln_data.get("artifact", {})
            vulnerability = vuln_data.get("vulnerability", {})
            
            # Рассчет скора и факторов
            cvss = float(vulnerability.get("cvss", [{"metrics": {"baseScore": 0.0}}])[0].get("metrics", {}).get("baseScore", 0.0))
            severity = vulnerability.get("severity", "unknown")
            
            # Установка весов из настроек
            impact_factor = 0.5  # Для примера
            exploit_probability = 0.3  # Для примера
            
            # Расчет итогового скора
            score = (
                settings.ALPHA * cvss +
                settings.BETA * impact_factor +
                settings.GAMMA * exploit_probability
            )
            
            # Формирование результата
            return {
                "id": vuln_id,
                "container_id": container_id,
                "cve_id": cve_id,
                "package_name": package.get("name", ""),
                "package_version": package.get("version", ""),
                "fixed_version": vuln_data.get("fix", {}).get("versions", [None])[0],
                "cvss": cvss,
                "severity": severity,
                "description": vulnerability.get("description", ""),
                "details": vuln_data,
                "score": score,
                "impact_factor": impact_factor,
                "exploit_probability": exploit_probability
            }
        
        except Exception as e:
            logger.error(f"Ошибка при парсинге уязвимости: {str(e)}")
            return None 
