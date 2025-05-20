import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter,
  ArrowUpDown, 
  BarChart2,
  ChevronDown,
  FileText,
  PlaySquare,
  RefreshCw
} from 'lucide-react';
import { getVulnerabilities } from '../api/vulnerabilities';
import { getContainers } from '../api/containers';
import { VulnerabilityWithContainer, Container } from '../types/api';

// Функция для расчета процента от CVSS
const calculateCVSSPercentage = (cvss: number) => {
  return (cvss / 10) * 100;
};

const Vulnerabilities: React.FC = () => {
  const navigate = useNavigate();
  
  // Состояние фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [containerFilter, setContainerFilter] = useState<string | null>(null);
  const [cvssFilter, setCvssFilter] = useState<string | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  
  // Состояние сортировки
  const [sortBy, setSortBy] = useState<string>('cvss');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Состояние выбранных элементов для действий
  const [selectedVulns, setSelectedVulns] = useState<string[]>([]);
  const [selectedAll, setSelectedAll] = useState(false);
  
  // Состояние для отображения подробностей
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  
  // Получение данных уязвимостей через API
  const { 
    data: vulnerabilities = [], 
    isLoading: vulnerabilitiesLoading,
    refetch: refetchVulnerabilities
  } = useQuery(
    ['vulnerabilities'],
    () => getVulnerabilities(),
    { 
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000 // 1 минута
    }
  );
  
  // Получение списка контейнеров для фильтра
  const { 
    data: containers = [], 
    isLoading: containersLoading 
  } = useQuery(
    ['containers'],
    getContainers,
    { 
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 минут
    }
  );
  
  // Список уникальных имен контейнеров
  const containerNames = React.useMemo(() => {
    if (!containers) return [];
    return Array.from(new Set(containers.map((c: Container) => c.name)));
  }, [containers]);
  
  // Обработчик изменения сортировки
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };
  
  // Обработчик выбора уязвимости
  const handleSelectVuln = (id: string) => {
    setSelectedVulns(prev => 
      prev.includes(id) 
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  };
  
  // Обработчик выбора всех уязвимостей
  const handleSelectAll = () => {
    if (selectedAll) {
      setSelectedVulns([]);
    } else {
      setSelectedVulns(filteredVulnerabilities.map(v => v.id));
    }
    setSelectedAll(!selectedAll);
  };
  
  // Обработчик планирования
  const handlePlan = () => {
    if (selectedVulns.length === 0) return;
    navigate('/plan', { state: { vulnerabilities: selectedVulns } });
  };
  
  // Фильтрация и сортировка данных
  const filteredVulnerabilities = React.useMemo(() => {
    if (!vulnerabilities) return [];
    
    return vulnerabilities
      .filter((vuln: VulnerabilityWithContainer) => {
        const matchesSearch = searchTerm === '' || 
          vuln.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vuln.container_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (vuln.package_name && vuln.package_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (vuln.description && vuln.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesSeverity = severityFilter.length === 0 || 
          severityFilter.includes(vuln.severity);
        
        const matchesContainer = containerFilter === null || 
          vuln.container_name === containerFilter;
        
        const matchesCVSS = cvssFilter === null || 
          (cvssFilter === 'critical' && vuln.cvss >= 9.0) ||
          (cvssFilter === 'high' && vuln.cvss >= 7.0 && vuln.cvss < 9.0) ||
          (cvssFilter === 'medium' && vuln.cvss >= 4.0 && vuln.cvss < 7.0) ||
          (cvssFilter === 'low' && vuln.cvss < 4.0);
        
        return matchesSearch && matchesSeverity && matchesContainer && matchesCVSS;
      })
      .sort((a: VulnerabilityWithContainer, b: VulnerabilityWithContainer) => {
        const factor = sortOrder === 'asc' ? 1 : -1;
        if (sortBy === 'cvss') {
          return (a.cvss - b.cvss) * factor;
        } else if (sortBy === 'severity') {
          const severityOrder: Record<string, number> = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          return (severityOrder[a.severity] - severityOrder[b.severity]) * factor;
        } else if (sortBy === 'container') {
          return a.container_name.localeCompare(b.container_name) * factor;
        } else {
          return a.id.localeCompare(b.id) * factor;
        }
      });
  }, [vulnerabilities, searchTerm, severityFilter, containerFilter, cvssFilter, sortBy, sortOrder]);

  // Счетчики по типам уязвимостей для диаграммы
  const criticalCount = React.useMemo(() => {
    if (!vulnerabilities) return 0;
    return vulnerabilities.filter((v: VulnerabilityWithContainer) => v.severity === 'Critical').length;
  }, [vulnerabilities]);
  
  const highCount = React.useMemo(() => {
    if (!vulnerabilities) return 0;
    return vulnerabilities.filter((v: VulnerabilityWithContainer) => v.severity === 'High').length;
  }, [vulnerabilities]);
  
  const mediumCount = React.useMemo(() => {
    if (!vulnerabilities) return 0;
    return vulnerabilities.filter((v: VulnerabilityWithContainer) => v.severity === 'Medium').length;
  }, [vulnerabilities]);
  
  const lowCount = React.useMemo(() => {
    if (!vulnerabilities) return 0;
    return vulnerabilities.filter((v: VulnerabilityWithContainer) => v.severity === 'Low').length;
  }, [vulnerabilities]);
  
  // Счетчики по типам уязвимостей для отфильтрованных данных
  const filteredCriticalCount = filteredVulnerabilities.filter(v => v.severity === 'Critical').length;
  const filteredHighCount = filteredVulnerabilities.filter(v => v.severity === 'High').length;
  const filteredMediumCount = filteredVulnerabilities.filter(v => v.severity === 'Medium').length;
  const filteredLowCount = filteredVulnerabilities.filter(v => v.severity === 'Low').length;

  // Функция определения цвета по критичности
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-destructive/20 text-destructive';
      case 'High': return 'bg-warning/20 text-warning';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-500';
      case 'Low': return 'bg-success/20 text-success';
      default: return 'bg-secondary/40 text-muted-foreground';
    }
  };

  // Функция определения цвета фона по критичности
  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-destructive';
      case 'High': return 'bg-warning';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  // Состояние загрузки
  const isLoading = vulnerabilitiesLoading || containersLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h1 className="text-2xl font-bold">Уязвимости</h1>
            <div className="flex space-x-2">
              {selectedVulns.length > 0 && (
                <button 
                  className="btn btn-primary"
                  onClick={handlePlan}
                >
                  <PlaySquare className="h-4 w-4 mr-2" />
                  Запланировать исправление
                </button>
              )}
              <button 
                className="btn btn-secondary"
                onClick={() => refetchVulnerabilities()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Поиск по ID, контейнеру, компоненту..."
                className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary"
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
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-md shadow-lg z-10 p-2">
                  <div className="p-2">
                    <div className="mb-3">
                      <label className="text-sm font-medium block mb-1">Критичность</label>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            severityFilter.includes('Critical') ? 'bg-destructive text-white' : 'bg-destructive/20 text-destructive'
                          }`}
                          onClick={() => setSeverityFilter(prev => 
                            prev.includes('Critical') 
                              ? prev.filter(s => s !== 'Critical') 
                              : [...prev, 'Critical']
                          )}
                        >
                          Critical
                        </button>
                        <button 
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            severityFilter.includes('High') ? 'bg-warning text-white' : 'bg-warning/20 text-warning'
                          }`}
                          onClick={() => setSeverityFilter(prev => 
                            prev.includes('High') 
                              ? prev.filter(s => s !== 'High') 
                              : [...prev, 'High']
                          )}
                        >
                          High
                        </button>
                        <button 
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            severityFilter.includes('Medium') ? 'bg-yellow-500 text-white' : 'bg-yellow-500/20 text-yellow-500'
                          }`}
                          onClick={() => setSeverityFilter(prev => 
                            prev.includes('Medium') 
                              ? prev.filter(s => s !== 'Medium') 
                              : [...prev, 'Medium']
                          )}
                        >
                          Medium
                        </button>
                        <button 
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            severityFilter.includes('Low') ? 'bg-success text-white' : 'bg-success/20 text-success'
                          }`}
                          onClick={() => setSeverityFilter(prev => 
                            prev.includes('Low') 
                              ? prev.filter(s => s !== 'Low') 
                              : [...prev, 'Low']
                          )}
                        >
                          Low
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="text-sm font-medium block mb-1">Контейнер</label>
                      <select 
                        className="w-full p-2 bg-secondary border border-border rounded-md"
                        value={containerFilter || ''}
                        onChange={(e) => setContainerFilter(e.target.value || null)}
                      >
                        <option value="">Все контейнеры</option>
                        {containerNames.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="mb-3">
                      <label className="text-sm font-medium block mb-1">CVSS</label>
                      <div className="flex flex-col space-y-1">
                        <label className="flex items-center text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name="cvss" 
                            checked={cvssFilter === null} 
                            onChange={() => setCvssFilter(null)}
                            className="mr-2"
                          />
                          Все
                        </label>
                        <label className="flex items-center text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name="cvss" 
                            checked={cvssFilter === 'critical'} 
                            onChange={() => setCvssFilter('critical')}
                            className="mr-2"
                          />
                          Critical (9.0+)
                        </label>
                        <label className="flex items-center text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name="cvss" 
                            checked={cvssFilter === 'high'} 
                            onChange={() => setCvssFilter('high')}
                            className="mr-2"
                          />
                          High (7.0-8.9)
                        </label>
                        <label className="flex items-center text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name="cvss" 
                            checked={cvssFilter === 'medium'} 
                            onChange={() => setCvssFilter('medium')}
                            className="mr-2"
                          />
                          Medium (4.0-6.9)
                        </label>
                        <label className="flex items-center text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name="cvss" 
                            checked={cvssFilter === 'low'} 
                            onChange={() => setCvssFilter('low')}
                            className="mr-2"
                          />
                          Low (0.1-3.9)
                        </label>
                      </div>
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
            
            <div className="flex space-x-2">
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-secondary/50 text-muted-foreground'}`}
                onClick={() => setViewMode('list')}
              >
                Список
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${viewMode === 'detail' ? 'bg-primary text-white' : 'bg-secondary/50 text-muted-foreground'}`}
                onClick={() => setViewMode('detail')}
              >
                Детали
              </button>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-3 text-left">
                    <input 
                      type="checkbox" 
                      checked={selectedAll} 
                      onChange={handleSelectAll} 
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground cursor-pointer" onClick={() => handleSort('id')}>
                    <div className="flex items-center">
                      ID {sortBy === 'id' && <ArrowUpDown className="h-3 w-3 ml-1" />}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground cursor-pointer" onClick={() => handleSort('severity')}>
                    <div className="flex items-center">
                      Критичность {sortBy === 'severity' && <ArrowUpDown className="h-3 w-3 ml-1" />}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground cursor-pointer" onClick={() => handleSort('cvss')}>
                    <div className="flex items-center">
                      CVSS {sortBy === 'cvss' && <ArrowUpDown className="h-3 w-3 ml-1" />}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground cursor-pointer" onClick={() => handleSort('container')}>
                    <div className="flex items-center">
                      Контейнер {sortBy === 'container' && <ArrowUpDown className="h-3 w-3 ml-1" />}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    Компонент
                  </th>
                  <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredVulnerabilities.length > 0 ? (
                  filteredVulnerabilities.map((vuln) => (
                    <tr key={vuln.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={selectedVulns.includes(vuln.id)} 
                            onChange={() => handleSelectVuln(vuln.id)} 
                            className="mr-3 rounded border-border text-primary focus:ring-primary"
                          />
                          <Link to={`/vulnerabilities/${vuln.id}`} className="text-primary hover:underline">
                            {vuln.cve_id || vuln.id}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                          {vuln.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center">
                          <div className="w-24 bg-secondary/50 rounded-full h-2">
                            <div 
                              className={`${getSeverityBgColor(vuln.severity)} h-2 rounded-full`}
                              style={{ width: `${calculateCVSSPercentage(vuln.cvss)}%` }}
                            />
                          </div>
                          <span className="ml-2 text-sm font-mono">{vuln.cvss.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Link to={`/containers/${vuln.container_id}`} className="text-primary hover:underline">
                          {vuln.container_name}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-sm">
                        <div className="flex flex-col">
                          <span>{vuln.package_name}</span>
                          <span className="text-xs text-muted-foreground">{vuln.package_version}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex space-x-2">
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => { /* Детальная информация */ }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Детали
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              navigate('/plan', { state: { vulnerabilities: [vuln.id] } });
                            }}
                          >
                            <PlaySquare className="h-3 w-3 mr-1" />
                            План
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Уязвимости не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="w-full lg:w-80 space-y-6">
        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">Статистика уязвимостей</h2>
          
          {/* Bar chart */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-destructive font-medium">Critical</span>
                <span>{criticalCount}</span>
              </div>
              <div className="w-full bg-secondary/30 rounded-full h-4">
                <div 
                  className="bg-destructive rounded-full h-4" 
                  style={{ width: `${vulnerabilities.length > 0 ? (criticalCount / vulnerabilities.length) * 100 : 0}%` }} 
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-warning font-medium">High</span>
                <span>{highCount}</span>
              </div>
              <div className="w-full bg-secondary/30 rounded-full h-4">
                <div 
                  className="bg-warning rounded-full h-4" 
                  style={{ width: `${vulnerabilities.length > 0 ? (highCount / vulnerabilities.length) * 100 : 0}%` }} 
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-yellow-500 font-medium">Medium</span>
                <span>{mediumCount}</span>
              </div>
              <div className="w-full bg-secondary/30 rounded-full h-4">
                <div 
                  className="bg-yellow-500 rounded-full h-4" 
                  style={{ width: `${vulnerabilities.length > 0 ? (mediumCount / vulnerabilities.length) * 100 : 0}%` }} 
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-success font-medium">Low</span>
                <span>{lowCount}</span>
              </div>
              <div className="w-full bg-secondary/30 rounded-full h-4">
                <div 
                  className="bg-success rounded-full h-4" 
                  style={{ width: `${vulnerabilities.length > 0 ? (lowCount / vulnerabilities.length) * 100 : 0}%` }} 
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-border">
            <div className="text-sm font-medium text-muted-foreground mb-2">Отфильтровано:</div>
            <div className="flex justify-between text-sm mb-2">
              <span>Critical</span>
              <span className="font-medium text-destructive">{filteredCriticalCount}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>High</span>
              <span className="font-medium text-warning">{filteredHighCount}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Medium</span>
              <span className="font-medium text-yellow-500">{filteredMediumCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Low</span>
              <span className="font-medium text-success">{filteredLowCount}</span>
            </div>
          </div>
        </div>
        
        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">Действия</h2>
          
          <div className="space-y-3">
            <button className="btn btn-primary w-full" onClick={handlePlan} disabled={selectedVulns.length === 0}>
              <PlaySquare className="h-4 w-4 mr-2" />
              Создать план исправления
            </button>
            
            <button className="btn btn-secondary w-full" onClick={() => handleSelectAll()}>
              {selectedAll ? 'Снять выделение' : 'Выбрать все'}
            </button>
            
            <button className="btn btn-secondary w-full" onClick={() => refetchVulnerabilities()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить данные
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm mb-2">
              <span className="font-medium">Выбрано уязвимостей:</span> {selectedVulns.length}
            </div>
            
            {selectedVulns.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedVulns.slice(0, 3).map(id => {
                  const vuln = vulnerabilities.find((v: VulnerabilityWithContainer) => v.id === id);
                  return (
                    <span key={id} className={`px-2 py-1 rounded text-xs font-medium ${vuln ? getSeverityColor(vuln.severity) : ''}`}>
                      {vuln?.cve_id || id}
                    </span>
                  );
                })}
                {selectedVulns.length > 3 && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-secondary/40 text-muted-foreground">
                    +{selectedVulns.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vulnerabilities; 
