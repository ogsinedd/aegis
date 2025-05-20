import os
import sys
import docker
import platform
from loguru import logger

def test_docker_connections():
    """
    Тестирует различные способы подключения к Docker API и записывает результаты
    """
    logger.info(f"Операционная система: {platform.system()} {platform.release()}")
    logger.info(f"Переменные окружения: DOCKER_HOST={os.environ.get('DOCKER_HOST', 'не установлена')}")
    
    connection_methods = [
        # Стандартный способ (автоопределение)
        {"name": "Стандартный клиент", "params": {}},
        
        # Unix socket
        {"name": "Unix сокет /var/run/docker.sock", "params": {"base_url": "unix:///var/run/docker.sock"}},
        
        # Для macOS
        {"name": "macOS сокет", "params": {"base_url": "unix:///Users/a1/.docker/run/docker.sock"}},
        
        # Docker Desktop for Mac
        {"name": "Docker Desktop for Mac", "params": {"base_url": "unix:///Users/a1/.docker/desktop/docker.sock"}},
        
        # TCP
        {"name": "localhost TCP", "params": {"base_url": "tcp://localhost:2375"}},
        
        # Host Docker internal
        {"name": "host.docker.internal", "params": {"base_url": "tcp://host.docker.internal:2375"}},
    ]
    
    for method in connection_methods:
        try:
            logger.info(f"Попытка подключения: {method['name']}")
            client = docker.from_env() if not method["params"] else docker.DockerClient(**method["params"])
            version = client.version()
            logger.success(f"✓ {method['name']} - успешно! Версия Docker: {version.get('Version', 'неизвестна')}")
        except Exception as e:
            logger.error(f"✗ {method['name']} - ошибка: {str(e)}")
    
    # Проверка наличия Docker сокетов в различных местах
    possible_socket_paths = [
        "/var/run/docker.sock",
        "/Users/a1/.docker/run/docker.sock",
        "/Users/a1/.docker/desktop/docker.sock"
    ]
    
    for path in possible_socket_paths:
        if os.path.exists(path):
            logger.info(f"Сокет существует: {path}")
        else:
            logger.warning(f"Сокет не найден: {path}")

if __name__ == "__main__":
    test_docker_connections() 
