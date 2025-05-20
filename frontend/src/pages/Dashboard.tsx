import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getContainers } from '../api/containers';
import { getVulnerabilities } from '../api/vulnerabilities';
import { getPlanStatus } from '../api/plan';
import { 
  ArrowUpRight, 
  RefreshCw 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PatchPlanWithDetails } from '../types/api';

const Dashboard: React.FC = () => {
  // Получение данных о контейнерах
  const { data: containers, isLoading: containersLoading, refetch: refetchContainers } = useQuery(
    ['containers'],
    getContainers,
    { staleTime: 60 * 1000 } // 1 минута
  );

  // Получение данных об уязвимостях
  const { data: vulnerabilities, isLoading: vulnerabilitiesLoading, refetch: refetchVulnerabilities } = useQuery(
    ['vulnerabilities'],
    () => getVulnerabilities(),
    { staleTime: 60 * 1000 } // 1 минута
  );

  // Получение данных о плане исправлений
  const { data: patchPlans, isLoading: patchPlansLoading, refetch: refetchPatchPlans } = useQuery(
    ['patchPlans'],
    () => getPlanStatus(),
    { staleTime: 60 * 1000 } // 1 минута
  );

  // Расчет общей статистики
  const stats = React.useMemo(() => {
    if (!containers || !vulnerabilities) return null;

    const totalContainers = containers.length;
    const activeContainers = containers.filter(c => c.status === 'running').length;
    const totalVulnerabilities = vulnerabilities.length;

    // Подсчет по критичности
    const criticalCount = vulnerabilities.filter(v => v.severity === 'Critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'High').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'Medium').length;
    const lowCount = vulnerabilities.filter(v => v.severity === 'Low').length;

    // Топ по CVSS
    const topCVSS = [...vulnerabilities].sort((a, b) => b.cvss - a.cvss).slice(0, 5);

    return {
      totalContainers,
      activeContainers,
      totalVulnerabilities,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      topCVSS
    };
  }, [containers, vulnerabilities]);

  // Обработчик обновления
  const handleRefresh = () => {
    refetchContainers();
    refetchVulnerabilities();
    refetchPatchPlans();
  };

  const isLoading = containersLoading || vulnerabilitiesLoading || patchPlansLoading;

  if (isLoading) {
    return <div className="loading">
      <div className="loading-spinner" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Containers Card */}
        <div className="card flex-1 overflow-hidden">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Контейнеры</h2>
            <button className="btn btn-primary" onClick={handleRefresh}>
              <RefreshCw size={16} className="mr-2" />
              Обновить
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Имя</th>
                  <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Статус</th>
                  <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Образ</th>
                </tr>
              </thead>
              <tbody>
                {containers && containers.slice(0, 5).map((container) => (
                  <tr key={container.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                    <td className="py-3">
                      <Link to={`/containers/${container.id}`} className="text-primary hover:underline">
                        {container.name}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        container.status === 'running' 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-destructive/20 text-destructive'
                      }`}>
                        {container.status === 'running' ? 'запущен' : 'остановлен'}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">{container.image}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <Link to="/containers" className="text-primary hover:underline inline-flex items-center">
              Показать все
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="card md:w-80">
          <h2 className="text-xl font-semibold mb-4">Статистика</h2>
          <div className="space-y-4">
            <div>
              <p className="text-muted-foreground mb-1">Контейнеры</p>
              <div className="flex justify-between">
                <span>Всего</span>
                <span className="font-medium">{stats?.totalContainers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Активны</span>
                <span className="font-medium">{stats?.activeContainers || 0}</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Уязвимости</p>
              <div className="flex justify-between">
                <span>Всего</span>
                <span className="font-medium">{stats?.totalVulnerabilities || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Critical</span>
                <span className="font-medium text-destructive">{stats?.criticalCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>High</span>
                <span className="font-medium text-warning">{stats?.highCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Medium</span>
                <span className="font-medium text-yellow-500">{stats?.mediumCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* План исправлений */}
      <div className="card">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">План исправлений</h2>
          <button className="btn btn-primary" onClick={handleRefresh}>
            <RefreshCw size={16} className="mr-2" />
            Обновить
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Контейнер</th>
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Уязвимость</th>
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Сценарий</th>
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Время</th>
                <th className="py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Длительность</th>
              </tr>
            </thead>
            <tbody>
              {patchPlans && patchPlans.slice(0, 3).map((plan: PatchPlanWithDetails) => (
                <tr key={plan.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                  <td className="py-3">{plan.container_name}</td>
                  <td className="py-3">
                    <Link to={`/vulnerabilities/${plan.vulnerability_id}`} className="text-primary hover:underline">
                      {plan.vulnerability_cve || plan.vulnerability_id}
                    </Link>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-secondary text-muted-foreground">
                      {plan.scenario === 'hot-patch' ? 'Hot Patch' : 
                       plan.scenario === 'rolling-update' ? 'Rolling Update' : 'Blue-Green'}
                    </span>
                  </td>
                  <td className="py-3">{new Date(plan.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  <td className="py-3">{plan.duration} мин</td>
                </tr>
              ))}
              {(!patchPlans || patchPlans.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    Нет запланированных задач
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-center">
          <Link to="/plan" className="text-primary hover:underline inline-flex items-center">
            Все задачи
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
