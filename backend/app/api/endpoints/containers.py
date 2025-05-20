from typing import List, Optional
import docker
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from starlette.status import HTTP_404_NOT_FOUND
from loguru import logger
import time
import os
import platform
import subprocess

from app.services.collector import ContainerCollector
from app.db.session import get_db
from app.core.config import settings
from app.schemas.container import Container, ContainerScanResponse

router = APIRouter()

def get_docker_client():
    """Получение клиента Docker с учетом особенностей разных платформ"""
    try:
        # Проверка переменной окружения DOCKER_HOST
        docker_host = os.environ.get('DOCKER_HOST')
        if docker_host:
            logger.info(f"Используем DOCKER_HOST из переменной окружения: {docker_host}")
            try:
                return docker.DockerClient(base_url=docker_host)
            except Exception as e:
                logger.warning(f"Не удалось подключиться используя DOCKER_HOST: {str(e)}")
        
        # Решение 1: Проверка версии urllib3
        try:
            import urllib3
            logger.info(f"Используемая версия urllib3: {urllib3.__version__}")
        except Exception as e:
            logger.warning(f"Не удалось проверить версию urllib3: {str(e)}")

        # Решение 2: Попытка использовать только docker.APIClient вместо DockerClient
        try:
            logger.info("Пробуем подключиться используя только APIClient")
            api_client = docker.APIClient()
            version = api_client.version()
            logger.info(f"Успешное подключение через APIClient. Версия Docker: {version.get('Version', 'неизвестна')}")
            return docker.DockerClient(api_client=api_client)
        except Exception as e:
            logger.warning(f"Не удалось подключиться через APIClient: {str(e)}")
            
        # Решение 3: Проверка конфигурации Docker Desktop
        if platform.system() == "Darwin":
            try:
                # Проверяем конфигурацию Docker Desktop
                docker_config_path = os.path.expanduser("~/.docker/config.json")
                if os.path.exists(docker_config_path):
                    logger.info(f"Найден файл конфигурации Docker: {docker_config_path}")
                
                # Проверка соединения через явное указание протокола
                for protocol in ["unix", "npipe", "http", "tcp", "ssh"]:
                    for socket_path in [
                        "/var/run/docker.sock",
                        "/run/docker.sock",
                        os.path.expanduser("~/.docker/run/docker.sock"),
                        os.path.expanduser("~/.docker/desktop/docker.sock")
                    ]:
                        if os.path.exists(socket_path):
                            base_url = f"{protocol}://{socket_path}"
                            try:
                                logger.info(f"Пробуем подключиться через {base_url}")
                                client = docker.DockerClient(base_url=base_url)
                                client.ping()  # Проверка соединения
                                logger.success(f"Успешное подключение через {base_url}")
                                return client
                            except Exception as e:
                                logger.warning(f"Не удалось подключиться через {base_url}: {str(e)}")
            except Exception as e:
                logger.warning(f"Ошибка при проверке конфигурации Docker Desktop: {str(e)}")
                
        # Решение 4: Использовать TCP вместо сокета
        for host in ["localhost", "127.0.0.1", "host.docker.internal"]:
            for port in [2375, 2376]:
                try:
                    base_url = f"tcp://{host}:{port}"
                    logger.info(f"Пробуем подключиться через {base_url}")
                    client = docker.DockerClient(base_url=base_url)
                    client.ping()  # Проверка соединения
                    logger.success(f"Успешное подключение через {base_url}")
                    return client
                except Exception as e:
                    logger.warning(f"Не удалось подключиться через {base_url}: {str(e)}")
        
        # Решение 5: Принудительное использование Docker CLI
        try:
            logger.info("Пробуем использовать Docker CLI")
            result = subprocess.run(["docker", "info", "--format", "{{.DockerRootDir}}"], 
                                capture_output=True, text=True, check=True)
            if result.returncode == 0:
                logger.info(f"Docker CLI работает, root: {result.stdout.strip()}")
                # Если CLI работает, используем его для передачи команд
                return docker.from_env()
        except Exception as e:
            logger.warning(f"Не удалось использовать Docker CLI: {str(e)}")
                    
        # Проверка альтернативного сокета для macOS
        if os.path.exists('/var/run/docker.sock.alternate'):
            logger.info("Найден альтернативный Docker socket для macOS")
            return docker.DockerClient(base_url='unix:///var/run/docker.sock.alternate')
        
        # Пробуем стандартный способ подключения
        try:
            client = docker.from_env()
            client.ping()  # Проверка подключения
            logger.info("Успешное подключение стандартным методом")
            return client
        except Exception as e:
            logger.warning(f"Не удалось подключиться стандартным способом: {str(e)}")
            
        # На macOS Docker socket может находиться в разных местах
        if platform.system() == "Darwin":
            # Проверяем наличие Docker CLI в $HOME/.docker/bin
            docker_cli_path = os.path.expanduser("~/.docker/bin/docker")
            if os.path.exists(docker_cli_path):
                logger.info(f"Найден Docker CLI по пути: {docker_cli_path}")
                # Проверяем, может ли Docker CLI подключиться и получить информацию о сокете
                try:
                    # Пытаемся выполнить docker info для получения пути к сокету
                    result = subprocess.run([docker_cli_path, "info", "--format", "{{.DockerRootDir}}"], 
                                           capture_output=True, text=True, check=True)
                    docker_root = result.stdout.strip()
                    logger.info(f"Docker root директория: {docker_root}")
                    
                    # Пытаемся найти сокет в docker root директории
                    if docker_root:
                        socket_path = os.path.join(docker_root, "daemon.sock")
                        if os.path.exists(socket_path):
                            logger.info(f"Найден Docker socket по пути: {socket_path}")
                            return docker.DockerClient(base_url=f"unix://{socket_path}")
                except Exception as e:
                    logger.warning(f"Не удалось получить информацию через Docker CLI: {str(e)}")
            
            # Пробуем разные варианты путей для Docker Desktop
            possible_paths = [
                "/var/run/docker.sock",
                "/run/host-services/docker.sock",
                os.path.expanduser("~/.docker/run/docker.sock"),
                os.path.expanduser("~/.docker/desktop/docker.sock"),
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    logger.info(f"Найден Docker socket по пути: {path}")
                    return docker.DockerClient(base_url=f"unix://{path}")
                    
            # Пробуем TCP-соединение (если настроено)
            try:
                logger.info("Пробуем подключиться через TCP localhost")
                return docker.DockerClient(base_url="tcp://localhost:2375")
            except Exception as e:
                logger.warning(f"Не удалось подключиться через TCP localhost: {str(e)}")
                
            try:
                logger.info("Пробуем подключиться через TCP host.docker.internal")
                return docker.DockerClient(base_url="tcp://host.docker.internal:2375")
            except Exception as e:
                logger.warning(f"Не удалось подключиться через TCP host.docker.internal: {str(e)}")
                
        # Для Linux проверяем, запущены ли мы в контейнере
        elif platform.system() == "Linux":
            # В контейнере socket должен быть примонтирован
            if os.path.exists("/var/run/docker.sock"):
                return docker.DockerClient(base_url="unix:///var/run/docker.sock")
                
        # Если все не получилось, выбрасываем ошибку
        raise Exception("Не удалось определить путь к Docker socket")
        
    except Exception as e:
        logger.error(f"Ошибка подключения к Docker API: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось подключиться к Docker API: {str(e)}"
        )

@router.get("/", response_model=List[Container])
async def get_all_containers():
    """Получение списка всех контейнеров Docker"""
    try:
        # Подключаемся напрямую к Docker Engine API
        client = get_docker_client()
        containers = []
        
        # Получаем список запущенных контейнеров
        running_containers = client.containers.list()
        
        # Преобразуем в нужный формат
        for container in running_containers:
            # Безопасное получение RestartCount с преобразованием в int
            restart_count = 0
            if 'RestartCount' in container.attrs:
                try:
                    restart_count = int(container.attrs['RestartCount'])
                except (ValueError, TypeError):
                    restart_count = 0
                    
            containers.append(Container(
                id=container.id[:12],  # Короткий ID
                name=container.name,
                image=container.image.tags[0] if container.image.tags else container.image.id,
                status=container.status,
                created_at=time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(container.attrs['Created'])),
                uptime=int(time.time() - container.attrs['Created']),
                restart_count=restart_count
            ))
            
        return containers
        
    except Exception as e:
        logger.error(f"Ошибка при получении списка контейнеров: {str(e)}")
        # Возвращаем пустой список в случае ошибки
        return []

@router.get("/{container_id}", response_model=Container)
async def get_container_by_id(container_id: str):
    """Получение данных конкретного контейнера по ID"""
    try:
        # Подключаемся напрямую к Docker Engine API
        client = get_docker_client()
        
        # Получаем контейнер по ID или имени
        try:
            container = client.containers.get(container_id)
        except docker.errors.NotFound:
            # Если не найден по ID, пробуем найти по имени
            containers = client.containers.list(filters={"name": container_id})
            if not containers:
                raise HTTPException(
                    status_code=HTTP_404_NOT_FOUND,
                    detail=f"Контейнер с ID/именем {container_id} не найден"
                )
            container = containers[0]
        
        # Безопасное получение RestartCount с преобразованием в int
        restart_count = 0
        if 'RestartCount' in container.attrs:
            try:
                restart_count = int(container.attrs['RestartCount'])
            except (ValueError, TypeError):
                restart_count = 0
                
        # Преобразуем в нужный формат
        return Container(
            id=container.id[:12],  # Короткий ID
            name=container.name,
            image=container.image.tags[0] if container.image.tags else container.image.id,
            status=container.status,
            created_at=time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(container.attrs['Created'])),
            uptime=int(time.time() - container.attrs['Created']),
            restart_count=restart_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при получении контейнера {container_id}: {str(e)}")
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=f"Контейнер с ID {container_id} не найден"
        )

@router.post("/{container_id}/scan", response_model=ContainerScanResponse)
async def scan_container(container_id: str, background_tasks: BackgroundTasks):
    """Запуск сканирования контейнера на уязвимости"""
    try:
        # Здесь будет логика сканирования в фоновом режиме
        # Пока просто возвращаем заглушку
        return ContainerScanResponse(
            container_id=container_id, 
            scan_id=f"scan-{int(time.time())}", 
            status="started"
        )
    except Exception as e:
        logger.error(f"Ошибка при запуске сканирования контейнера {container_id}: {str(e)}")
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=f"Не удалось запустить сканирование контейнера {container_id}"
        ) 
