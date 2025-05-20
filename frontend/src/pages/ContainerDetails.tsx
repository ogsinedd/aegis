import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getContainerById } from '../api/containers';
import { getVulnerabilities } from '../api/vulnerabilities';
import { VulnerabilityWithContainer } from '../types/api';

const ContainerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Получение данных о контейнере
  const { 
    data: container, 
    isLoading: containerLoading, 
    error: containerError 
  } = useQuery(
    ['container', id],
    () => getContainerById(id || ''),
    { 
      staleTime: 5 * 60 * 1000, // 5 минут
      enabled: !!id 
    }
  );

  // Получение уязвимостей контейнера
  const { 
    data: vulnerabilities, 
    isLoading: vulnerabilitiesLoading,
    error: vulnerabilitiesError 
  } = useQuery(
    ['vulnerabilities', id],
    () => getVulnerabilities({ container_id: id }),
    { 
      staleTime: 5 * 60 * 1000, // 5 минут
      enabled: !!id 
    }
  );

  // Проверка загрузки
  const isLoading = containerLoading || vulnerabilitiesLoading;
  const error = containerError || vulnerabilitiesError;

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Ошибка при загрузке данных: {(error as Error).message}
      </div>
    );
  }

  if (!container) {
    return (
      <div className="text-red-500 p-4">
        Контейнер не найден
      </div>
    );
  }

  // Группировка уязвимостей по критичности
  const vulnerabilitiesBySeverity = (vulnerabilities || []).reduce<Record<string, VulnerabilityWithContainer[]>>((acc, vuln) => {
    const severity = vuln.severity;
    if (!acc[severity]) {
      acc[severity] = [];
    }
    acc[severity].push(vuln);
    return acc;
  }, {});

  // Порядок критичности для сортировки
  const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{container.name}</h1>
        <div className="flex space-x-2">
          <Link 
            to="/containers" 
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            Назад
          </Link>
          <Link 
            to={`/vulnerabilities?container_id=${container.id}`} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Уязвимости
          </Link>
        </div>
      </div>

      {/* Информация о контейнере */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Основная информация</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">ID</dt>
              <dd className="mt-1 text-sm text-gray-900 break-all">{container.id}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Имя</dt>
              <dd className="mt-1 text-sm text-gray-900">{container.name}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Образ</dt>
              <dd className="mt-1 text-sm text-gray-900">{container.image}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Статус</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  container.status === 'running' ? 'bg-green-100 text-green-800' :
                  container.status === 'exited' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {container.status}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Уязвимости</h2>
          <div className="space-y-4">
            <div className="flex space-x-3">
              <div className="flex-1 text-center p-3 bg-red-50 rounded-md">
                <div className="text-2xl font-bold text-red-700">{container.critical_count}</div>
                <div className="text-sm text-red-500">Критические</div>
              </div>
              <div className="flex-1 text-center p-3 bg-orange-50 rounded-md">
                <div className="text-2xl font-bold text-orange-700">{container.high_count}</div>
                <div className="text-sm text-orange-500">Высокие</div>
              </div>
              <div className="flex-1 text-center p-3 bg-yellow-50 rounded-md">
                <div className="text-2xl font-bold text-yellow-700">{container.medium_count}</div>
                <div className="text-sm text-yellow-500">Средние</div>
              </div>
              <div className="flex-1 text-center p-3 bg-green-50 rounded-md">
                <div className="text-2xl font-bold text-green-700">{container.low_count}</div>
                <div className="text-sm text-green-500">Низкие</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Итоговый скор</div>
              <div className="text-2xl font-bold text-blue-600">{container.score.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица с уязвимостями */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Список уязвимостей</h2>
        <div className="overflow-x-auto">
          {vulnerabilities && vulnerabilities.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CVE</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пакет</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Версия</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Критичность</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CVSS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Скор</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {severityOrder.map(severity => 
                  vulnerabilitiesBySeverity[severity]?.map((vuln) => (
                    <tr key={vuln.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                        <Link to={`/vulnerabilities/${vuln.id}`}>{vuln.cve_id}</Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{vuln.package_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {vuln.package_version}
                        {vuln.fixed_version && (
                          <span className="text-green-600 ml-1">→ {vuln.fixed_version}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span 
                          className={`badge ${
                            vuln.severity === 'Critical' ? 'badge-critical' :
                            vuln.severity === 'High' ? 'badge-high' :
                            vuln.severity === 'Medium' ? 'badge-medium' : 'badge-low'
                          }`}
                        >
                          {vuln.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{vuln.cvss.toFixed(1)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{vuln.score.toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <div className="py-4 text-center text-gray-500">
              Уязвимости не найдены
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContainerDetails; 
