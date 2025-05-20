import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { generatePlan, getPlanStatus } from '../api/plan';
import { getContainers } from '../api/containers';
import { getVulnerabilities } from '../api/vulnerabilities';
import { 
  Calendar, 
  RefreshCw, 
  Play, 
  Check, 
  XCircle, 
  MoreHorizontal, 
  ChevronRight, 
  ChevronLeft,
  Clock,
  Calendar as CalendarIcon,
  Shield,
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import { Container, Vulnerability, PatchPlanWithDetails } from '../types/api';

const PatchPlan: React.FC = () => {
  const location = useLocation();
  // Состояние для параметров генерации плана
  const [window, setWindow] = useState<number>(24);
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [maxItems, setMaxItems] = useState<number | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [planTasks, setPlanTasks] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState({ start: 0, end: 24 });
  const [viewMode, setViewMode] = useState<'hours' | 'day'>('hours');
  const [scheduleChanged, setScheduleChanged] = useState(false);

  // Запросы для получения данных
  const { 
    data: containers = [], 
    isLoading: containersLoading 
  } = useQuery(['containers'], getContainers);

  const { 
    data: vulnerabilities = [], 
    isLoading: vulnerabilitiesLoading 
  } = useQuery(['vulnerabilities'], getVulnerabilities);

  const { 
    data: plan, 
    isLoading: planLoading, 
    refetch: refetchPlan 
  } = useQuery(
    ['plan', window, selectedContainers, maxItems],
    () => generatePlan({ 
      window, 
      container_id: selectedContainers, 
      max_items: maxItems 
    })
  );

  const { 
    data: planStatus = [], 
    isLoading: statusLoading, 
    refetch: refetchStatus
  } = useQuery(['planStatus'], () => getPlanStatus());
  
  // Эффект для инициализации данных из URL
  useEffect(() => {
    if (location.state?.vulnerabilities) {
      // Здесь получаем список уязвимостей из предыдущей страницы
      console.log('Received vulnerabilities:', location.state.vulnerabilities);
      // Можно использовать для инициализации состояния
    }
  }, [location]);

  // Эффект для обновления задач плана, когда план получен
  useEffect(() => {
    if (plan && plan.tasks) {
      setPlanTasks(plan.tasks);
      setIsGenerating(false);
    }
  }, [plan]);

  // Отдельный эффект для запуска запроса при изменении isGenerating
  useEffect(() => {
    if (isGenerating) {
      refetchPlan();
    }
  }, [isGenerating, refetchPlan]);

  // Обработчики изменения параметров
  const handleContainerChange = (container_id: string) => {
    setSelectedContainers(prev => {
      if (prev.includes(container_id)) {
        return prev.filter(id => id !== container_id);
      } else {
        return [...prev, container_id];
      }
    });
  };

  // Генерация плана
  const handleGeneratePlan = () => {
    setIsGenerating(true);
    refetchPlan();
  };

  // Обновление статуса
  const handleRefreshStatus = () => {
    refetchStatus();
  };

  // Проверка загрузки
  const isLoading = containersLoading || planLoading || statusLoading || isGenerating;

  // Функция для форматирования времени
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} мин`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours} ч ${mins > 0 ? `${mins} мин` : ''}`;
    }
  };

  // Функция для определения цвета сценария
  const getScenarioColor = (scenario: string): string => {
    switch (scenario) {
      case 'hot-patch':
        return 'bg-success/20 text-success border-success';
      case 'rolling-update':
        return 'bg-primary/20 text-primary border-primary';
      case 'blue-green':
        return 'bg-purple-500/20 text-purple-500 border-purple-500';
      default:
        return 'bg-secondary/40 text-muted-foreground border-muted';
    }
  };

  // Получение перевода для типа сценария
  const getScenarioName = (scenario: string): string => {
    switch (scenario) {
      case 'hot-patch':
        return 'Горячий патч';
      case 'rolling-update':
        return 'Без простоя';
      case 'blue-green':
        return 'Синий/зеленый';
      default:
        return scenario;
    }
  };

  const getContainerName = (id: string) => {
    return containers?.find((c: Container) => c.id === id)?.name || id;
  };

  const getVulnerabilityInfo = (id: string) => {
    return vulnerabilities?.find((v: Vulnerability) => v.id === id) || { severity: 'Unknown', cvss: 0, description: '' };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-destructive/20 text-destructive';
      case 'High': return 'bg-warning/20 text-warning';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-500';
      case 'Low': return 'bg-success/20 text-success';
      default: return 'bg-secondary/40 text-muted-foreground';
    }
  };

  // Обработчик выбора задачи
  const handleTaskSelect = (task: any) => {
    setSelectedTask(task === selectedTask ? null : task);
  };

  // Обработчик начала перетаскивания 
  const handleDragStart = (taskId: string) => {
    setDraggingTask(taskId);
  };

  // Обработчик перетаскивания по временной шкале
  const handleTimelineClick = (hour: number, containerId: string) => {
    if (draggingTask) {
      // Находим задачу
      const updatedTasks = planTasks.map(task => {
        if (task.id === draggingTask) {
          // Преобразуем часы в строку времени для задачи
          const date = new Date(task.start);
          date.setHours(hour);
          date.setMinutes(0);
          
          return {
            ...task,
            start: date.toISOString(),
            container_id: containerId
          };
        }
        return task;
      });
      
      setPlanTasks(updatedTasks);
      setDraggingTask(null);
      setScheduleChanged(true);
    }
  };

  // Получение часа из ISO строки
  const getHourFromISOString = (isoString: string): number => {
    return new Date(isoString).getHours();
  };

  // Вычисление позиции и ширины задачи на шкале
  const calculateTaskPosition = (task: any) => {
    const startHour = getHourFromISOString(task.start);
    const duration = parseInt(task.duration);
    const widthPercent = (duration / 60) * (100 / (timeRange.end - timeRange.start)); 
    const leftPercent = ((startHour - timeRange.start) / (timeRange.end - timeRange.start)) * 100;
    
    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`
    };
  };

  // Массив часов для отображения в шкале
  const hourLabels = Array.from(
    { length: timeRange.end - timeRange.start }, 
    (_, i) => timeRange.start + i
  );

  // Сохранение изменений расписания
  const handleSaveSchedule = () => {
    // Здесь был бы API запрос для сохранения изменений
    setScheduleChanged(false);
    // Показываем уведомление об успешном сохранении
    alert('Расписание успешно сохранено');
  };

  // Функция выполнения задачи
  const handleExecuteTask = (taskId: string) => {
    // Здесь был бы API запрос для запуска выполнения задачи
    console.log(`Executing task: ${taskId}`);
    // Обновляем статус задачи в UI
    const updatedTasks = planTasks.map(task => 
      task.id === taskId ? {...task, status: 'running'} : task
    );
    setPlanTasks(updatedTasks);
  };

  return (
    <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-0 min-h-[calc(100vh-4rem)]">
      {/* Левая панель с хуками */}
      {showLeftPanel && (
        <div className="lg:w-64 shrink-0 space-y-4 pr-4 border-r border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Хуки</h2>
            <button className="btn btn-secondary btn-sm">
              Добавить
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Список хуков */}
            <div className="bg-card border border-border rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary mr-2">
                    patch.started
                  </span>
                  <span className="font-medium">Уведомление</span>
                </div>
                <button className="p-1 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Отправка уведомления в Telegram при начале патча</p>
            </div>
            
            <div className="bg-card border border-border rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-destructive/20 text-destructive mr-2">
                    vulnerability.detected
                  </span>
                  <span className="font-medium">Jira тикет</span>
                </div>
                <button className="p-1 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Создание тикета в Jira при обнаружении критической уязвимости</p>
            </div>
            
            <div className="bg-card border border-border rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-success/20 text-success mr-2">
                    patch.completed
                  </span>
                  <span className="font-medium">Логирование</span>
                </div>
                <button className="p-1 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Запись результатов патча в систему логирования</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Кнопка для скрытия/показа левой панели */}
      <button 
        className="hidden lg:flex items-center justify-center h-8 w-8 bg-card border border-border rounded-md absolute left-64 top-1/2 transform -translate-y-1/2 z-10"
        onClick={() => setShowLeftPanel(!showLeftPanel)}
      >
        {showLeftPanel ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {/* Основной контент */}
      <div className="flex-1 space-y-6 px-4">
        {/* Заголовок и кнопки */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">План исправления</h1>
            <p className="text-muted-foreground">
              {plan && plan.scheduled_for ? `Запланировано на: ${new Date(plan.scheduled_for).toLocaleDateString()}` : 'План не создан'} | Задачи: {planTasks.length}
            </p>
          </div>
          <div className="flex space-x-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <input 
                type="date" 
                className="bg-secondary border border-border rounded-md p-2 pl-10 focus:ring-primary focus:border-primary"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleGeneratePlan}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Сгенерировать план
            </button>
            {scheduleChanged && (
              <button 
                className="btn btn-secondary"
                onClick={handleSaveSchedule}
              >
                <Check className="w-4 h-4 mr-2" />
                Сохранить изменения
              </button>
            )}
          </div>
        </div>
        
        {/* Переключатель вида таймлайна */}
        <div className="bg-card border border-border rounded-md p-2 flex justify-between items-center">
          <div className="flex space-x-2">
            <button 
              className={`px-3 py-1 rounded text-sm ${viewMode === 'hours' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
              onClick={() => setViewMode('hours')}
            >
              По часам
            </button>
            <button 
              className={`px-3 py-1 rounded text-sm ${viewMode === 'day' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
              onClick={() => setViewMode('day')}
            >
              По дням
            </button>
          </div>
          
          {/* Навигация по таймлайну */}
          <div className="flex items-center space-x-2">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setTimeRange(prev => ({
                start: Math.max(0, prev.start - 6),
                end: Math.max(6, prev.end - 6) 
              }))}
              disabled={timeRange.start <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm">
              {timeRange.start}:00 - {timeRange.end}:00
            </span>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setTimeRange(prev => ({
                start: Math.min(18, prev.start + 6),
                end: Math.min(24, prev.end + 6)
              }))}
              disabled={timeRange.end >= 24}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Timeline / Gantt chart */}
        <div className="bg-card border border-border rounded-md">
          {/* Timeline header */}
          <div className="flex border-b border-border p-3">
            <div className="w-36 flex-shrink-0 pr-4 font-medium">Контейнер</div>
            <div className="flex-1 grid grid-cols-12 gap-0">
              {hourLabels.map(hour => (
                <div key={hour} className="text-center text-xs text-muted-foreground border-l border-border/30 pl-1">
                  {hour}:00
                </div>
              ))}
            </div>
          </div>

          {/* Timeline content */}
          <div className="overflow-x-auto">
            {containers.map((container: Container) => {
              const containerTasks = planTasks.filter(t => t.container_id === container.id);
              
              return (
                <div 
                  key={container.id} 
                  className="flex border-b border-border/50 hover:bg-secondary/10 transition-colors"
                >
                  <div className="w-36 flex-shrink-0 pr-4 p-3 flex items-center font-medium">
                    {container.name}
                  </div>
                  <div 
                    className="flex-1 h-16 relative"
                    onClick={() => handleTimelineClick(Math.floor(Math.random() * 24), container.id)}
                  >
                    {/* Деления времени */}
                    <div className="grid grid-cols-12 h-full">
                      {hourLabels.map(hour => (
                        <div 
                          key={hour} 
                          className="border-l border-border/30 h-full relative"
                        >
                          {/* Часы отмечаем вертикальными линиями */}
                          {hour % 2 === 0 && (
                            <div className="absolute inset-y-0 left-0 w-full bg-secondary/10"></div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Задачи в контейнере */}
                    {containerTasks.map(task => {
                      const position = calculateTaskPosition(task);
                      const vulnInfo = getVulnerabilityInfo(task.vulnerability_id);
                      
                      return (
                        <div 
                          key={task.id}
                          className={`absolute top-2 h-12 rounded-md ${getScenarioColor(task.action_id)} border cursor-pointer transition-all`}
                          style={{ 
                            left: position.left,
                            width: position.width,
                            zIndex: selectedTask?.id === task.id ? 20 : 10
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskSelect(task);
                          }}
                          draggable={true}
                          onDragStart={() => handleDragStart(task.id)}
                        >
                          <div className="flex items-center h-full px-2">
                            <div className="truncate flex-1">
                              <div className="text-xs font-medium truncate">{task.vulnerability_id}</div>
                              <div className="text-xs truncate">{getScenarioName(task.action_id)}</div>
                            </div>
                            {task.status === 'running' && (
                              <div className="ml-1 animate-pulse">
                                <RefreshCw className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Правая панель с деталями */}
      <div className="lg:w-80 shrink-0 border-l border-border pl-4 space-y-6">
        {selectedTask ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Детали задачи</h2>
              <button 
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedTask(null)}
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-md p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Уязвимость</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{selectedTask.vulnerability_id}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(getVulnerabilityInfo(selectedTask.vulnerability_id).severity)}`}>
                      {getVulnerabilityInfo(selectedTask.vulnerability_id).severity}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getVulnerabilityInfo(selectedTask.vulnerability_id).description || 'Описание не доступно'}
                  </p>
                  <div className="pt-2 border-t border-border mt-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 mr-2" />
                      CVSS: {getVulnerabilityInfo(selectedTask.vulnerability_id).cvss.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-md p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Детали патча</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Контейнер</span>
                    <span className="font-medium">{getContainerName(selectedTask.container_id)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Сценарий</span>
                    <span className="font-medium">{getScenarioName(selectedTask.action_id)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Начало</span>
                    <span className="font-medium">{new Date(selectedTask.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Длительность</span>
                    <span className="font-medium">{formatDuration(parseInt(selectedTask.duration))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Статус</span>
                    <span className="font-medium flex items-center">
                      {selectedTask.status === 'scheduled' && (
                        <>
                          <Clock className="h-4 w-4 mr-1 text-warning" />
                          <span className="text-warning">Запланировано</span>
                        </>
                      )}
                      {selectedTask.status === 'running' && (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1 text-primary animate-spin" />
                          <span className="text-primary">Выполняется</span>
                        </>
                      )}
                      {selectedTask.status === 'completed' && (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1 text-success" />
                          <span className="text-success">Завершено</span>
                        </>
                      )}
                      {selectedTask.status === 'failed' && (
                        <>
                          <AlertCircle className="h-4 w-4 mr-1 text-destructive" />
                          <span className="text-destructive">Ошибка</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                {selectedTask.status === 'scheduled' && (
                  <button 
                    className="btn btn-primary w-full"
                    onClick={() => handleExecuteTask(selectedTask.id)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Выполнить
                  </button>
                )}
                <button className="btn btn-secondary w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Перенести
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <CalendarIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Выберите задачу</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Выберите задачу на временной шкале, чтобы просмотреть подробности и управлять исполнением
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatchPlan; 
