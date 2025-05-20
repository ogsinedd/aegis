#!/bin/bash

# Выводим информацию о системе
echo "=== Информация о системе ==="
uname -a
echo

# Выводим переменные окружения Docker
echo "=== Переменные окружения Docker ==="
echo "DOCKER_HOST=$DOCKER_HOST"
echo "DOCKER_CONFIG=$DOCKER_CONFIG"
echo "DOCKER_CERT_PATH=$DOCKER_CERT_PATH"
echo

# Проверяем доступ к Docker CLI
echo "=== Проверка Docker CLI ==="
if command -v docker &> /dev/null; then
    echo "✓ Docker CLI найден"
    docker version 2>/dev/null || echo "✗ Не удалось получить версию Docker"
    docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo "✗ Не удалось получить информацию о Docker"
else
    echo "✗ Docker CLI не найден"
fi
echo

# Проверяем различные пути к сокетам Docker
echo "=== Проверка наличия Docker сокетов ==="
SOCKET_PATHS=(
    "/var/run/docker.sock"
    "/run/docker.sock"
    "/run/host-services/docker.sock"
    "$HOME/.docker/run/docker.sock"
    "$HOME/.docker/desktop/docker.sock"
)

for path in "${SOCKET_PATHS[@]}"; do
    if [ -e "$path" ]; then
        echo "✓ $path существует ($(ls -la "$path"))"
        
        # Пробуем использовать curl для проверки соединения
        echo "  Проверка соединения через curl:"
        curl -s --unix-socket "$path" http://localhost/version 2>/dev/null | head -n 10 || echo "  ✗ Не удалось подключиться через curl"
    else
        echo "✗ $path не существует"
    fi
done
echo

# Проверяем TCP-подключение
echo "=== Проверка TCP-подключения ==="
for port in 2375 2376; do
    for host in "localhost" "127.0.0.1"; do
        echo "Проверка $host:$port..."
        curl -s "http://$host:$port/version" 2>/dev/null | head -n 10 || echo "✗ Не удалось подключиться к $host:$port"
    done
done
echo

# Проверяем файл конфигурации Docker
echo "=== Проверка конфигурации Docker ==="
CONFIG_PATH="$HOME/.docker/config.json"
if [ -f "$CONFIG_PATH" ]; then
    echo "✓ Файл конфигурации найден: $CONFIG_PATH"
    echo "Содержимое (без чувствительных данных):"
    grep -v "auth" "$CONFIG_PATH" || echo "Не удалось прочитать конфигурацию"
else
    echo "✗ Файл конфигурации не найден: $CONFIG_PATH"
fi
echo

echo "=== Завершено ===" 
