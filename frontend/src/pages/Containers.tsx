import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Package2,
  Play,
  Filter,
  ChevronDown,
  DownloadCloud,
  Settings
} from 'lucide-react';
import { getContainers } from '../api/containers';

const Containers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [vulnerabilityFilter, setVulnerabilityFilter] = useState<'all' | 'vulnerable' | 'secure'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'vulnerabilities'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [containersCount, setContainersCount] = useState({
    total: 0,
    running: 0,
    stopped: 0
  });

  // Получение данных через React Query
  const { data: containers, isLoading, refetch } = useQuery(
    ['containers'],
    getContainers,
    { staleTime: 30 * 1000 } // Обновлять каждые 30 секунд
  );

  // Расчет количества контейнеров
  useEffect(() => {
    if (containers) {
      setContainersCount({
        total: containers.length,
        running: containers.filter(c => c.status === 'running').length,
        stopped: containers.filter(c => c.status !== 'running').length
      });
    }
  }, [containers]);

  // Обработчик обновления списка контейнеров
  const handleRefresh = () => {
    refetch();
  };

  const handleSort = (field: 'name' | 'vulnerabilities') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Фильтрация данных
  const filteredContainers = containers
    ? containers
        .filter(container => {
          const matchesSearch = searchTerm === '' || 
            container.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            container.image.toLowerCase().includes(searchTerm.toLowerCase());
          
          const matchesStatus = statusFilter === null || container.status === statusFilter;
          
          const hasVulns = container.vulnerabilities > 0;
          const matchesVulnerability = vulnerabilityFilter === 'all' || 
            (vulnerabilityFilter === 'vulnerable' && hasVulns) ||
            (vulnerabilityFilter === 'secure' && !hasVulns);
          
          return matchesSearch && matchesStatus && matchesVulnerability;
        })
        .sort((a, b) => {
          if (sortBy === 'name') {
            return sortOrder === 'asc' 
              ? a.name.localeCompare(b.name) 
              : b.name.localeCompare(a.name);
          } else {
            return sortOrder === 'asc'
              ? (a.vulnerabilities || 0) - (b.vulnerabilities || 0)
              : (b.vulnerabilities || 0) - (a.vulnerabilities || 0);
          }
        })
    : [];

  // Форматирование даты
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Нет данных';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Обработчик для запуска сканирования конкретного контейнера
  const handleScan = (containerId: string) => {
    // Реализация сканирования контейнера
    console.log(`Scanning container: ${containerId}`);
  };

  // Обработчик для создания плана устранения уязвимостей
  const handleCreatePlan = (containerId: string) => {
    // Реализация создания плана
    console.log(`Creating plan for container: ${containerId}`);
  };

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и поиск */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Контейнеры</h1>
          <p className="text-muted-foreground mt-1">
            Всего: {containersCount.total} | Запущено: {containersCount.running} | Остановлено: {containersCount.stopped}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Поиск контейнеров..."
              className="pl-10 pr-4 py-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <button 
              className="btn btn-secondary flex items-center"
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Фильтры
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {isFilterMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-card border border-border rounded-md shadow-lg z-10 p-2">
                <div className="p-2">
                  <div className="mb-3">
                    <label className="text-sm font-medium block mb-1">Уязвимости</label>
                    <div className="flex flex-col space-y-1">
                      <label className="flex items-center text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="vulnerability" 
                          checked={vulnerabilityFilter === 'all'} 
                          onChange={() => setVulnerabilityFilter('all')}
                          className="mr-2"
                        />
                        Все
                      </label>
                      <label className="flex items-center text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="vulnerability" 
                          checked={vulnerabilityFilter === 'vulnerable'} 
                          onChange={() => setVulnerabilityFilter('vulnerable')}
                          className="mr-2"
                        />
                        С уязвимостями
                      </label>
                      <label className="flex items-center text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="vulnerability" 
                          checked={vulnerabilityFilter === 'secure'} 
                          onChange={() => setVulnerabilityFilter('secure')}
                          className="mr-2"
                        />
                        Безопасные
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="text-sm font-medium block mb-1">Сортировка</label>
                    <div className="flex flex-col space-y-1">
                      <label className="flex items-center text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="sort" 
                          checked={sortBy === 'name'} 
                          onChange={() => handleSort('name')}
                          className="mr-2"
                        />
                        По имени {sortBy === 'name' && `(${sortOrder === 'asc' ? 'А-Я' : 'Я-А'})`}
                      </label>
                      <label className="flex items-center text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="sort" 
                          checked={sortBy === 'vulnerabilities'} 
                          onChange={() => handleSort('vulnerabilities')}
                          className="mr-2"
                        />
                        По уязвимостям {sortBy === 'vulnerabilities' && `(${sortOrder === 'asc' ? 'мин-макс' : 'макс-мин'})`}
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <label className="flex items-center text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showAdvancedStats} 
                        onChange={() => setShowAdvancedStats(!showAdvancedStats)}
                        className="mr-2"
                      />
                      Расширенная статистика
                    </label>
                  </div>
                  
                  <div className="pt-2 border-t border-border mt-2">
                    <button 
                      className="btn btn-primary w-full"
                      onClick={() => setIsFilterMenuOpen(false)}
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button 
            className="btn btn-primary"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex space-x-2">
        <button 
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
            statusFilter === null ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
          }`}
          onClick={() => setStatusFilter(null)}
        >
          Все
        </button>
        <button 
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
            statusFilter === 'running' ? 'bg-primary/90 text-primary-foreground' : 'bg-primary/20 text-primary'
          }`}
          onClick={() => setStatusFilter('running')}
        >
          Запущенные
        </button>
        <button 
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
            statusFilter === 'exited' ? 'bg-destructive/90 text-white' : 'bg-destructive/20 text-destructive'
          }`}
          onClick={() => setStatusFilter('exited')}
        >
          Остановленные
        </button>
      </div>

      {/* Container List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Статус</th>
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Имя</th>
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Образ</th>
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Уязвимости</th>
                {showAdvancedStats && (
                  <>
                    <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">CPU</th>
                    <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Память</th>
                  </>
                )}
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Последнее сканирование</th>
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredContainers.map((container) => (
                <tr key={container.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                  <td className="py-3">
                    {container.status === 'running' ? (
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-primary mr-2" />
                        <span className="text-sm">Запущен</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                        <span className="text-sm">Остановлен</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3">
                    <Link to={`/containers/${container.id}`} className="flex items-center text-primary hover:underline">
                      <Package2 className="h-4 w-4 mr-2" />
                      <div>
                        <div>{container.name}</div>
                        <div className="text-xs text-muted-foreground">v{container.version}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">{container.image}</td>
                  <td className="py-3">
                    {container.vulnerabilities > 0 ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        container.vulnerabilities > 3 
                          ? 'bg-destructive/20 text-destructive' 
                          : 'bg-warning/20 text-warning'
                      }`}>
                        {container.vulnerabilities} найдено
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-success/20 text-success">
                        Безопасно
                      </span>
                    )}
                  </td>
                  {showAdvancedStats && (
                    <>
                      <td className="py-3 text-sm text-muted-foreground">
                        {container.cpu}
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {container.memory}
                      </td>
                    </>
                  )}
                  <td className="py-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      {formatDate(container.last_scan)}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex space-x-2">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleScan(container.id)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Сканировать
                      </button>
                      {container.vulnerabilities > 0 && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleCreatePlan(container.id)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          План
                        </button>
                      )}
                      <div className="relative group">
                        <button className="btn btn-secondary btn-sm p-1">
                          <Settings className="h-4 w-4" />
                        </button>
                        <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-10">
                          <div className="p-1">
                            <button className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/50 rounded flex items-center">
                              <DownloadCloud className="h-4 w-4 mr-2" />
                              Экспортировать отчет
                            </button>
                            {container.status === 'running' ? (
                              <button className="w-full text-left px-4 py-2 text-sm hover:bg-destructive/20 text-destructive rounded flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Остановить
                              </button>
                            ) : (
                              <button className="w-full text-left px-4 py-2 text-sm hover:bg-primary/20 text-primary rounded flex items-center">
                                <Play className="h-4 w-4 mr-2" />
                                Запустить
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Containers; 
