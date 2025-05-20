import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash, 
  Edit, 
  CheckCircle, 
  AlertCircle, 
  Code,
  Search,
  Clock,
  Save,
  File,
  Folder,
  X
} from 'lucide-react';

// Имитация данных для хуков
const hookData = [
  { id: 1, name: 'Уведомление о критической уязвимости', script: '/scripts/send_telegram.sh', event: 'vulnerability.detected', criteria: 'severity == "Critical"', active: true, timeout: 30 },
  { id: 2, name: 'Автообновление незначительных уязвимостей', script: '/scripts/auto_update.sh', event: 'patch.scheduled', criteria: 'severity == "Low"', active: true, timeout: 60 },
  { id: 3, name: 'Логирование обновления', script: '/scripts/log_deployment.py', event: 'container.updated', criteria: '', active: false, timeout: 15 },
  { id: 4, name: 'Создание тикета в Jira', script: '/scripts/create_jira_issue.py', event: 'vulnerability.detected', criteria: 'cvss > 7', active: true, timeout: 45 },
  { id: 5, name: 'Отправка отчета на почту', script: '/scripts/email_report.py', event: 'patch.completed', criteria: '', active: true, timeout: 120 },
  { id: 6, name: 'Обновление статуса в Slack', script: '/scripts/slack_notify.sh', event: 'patch.started', criteria: '', active: true, timeout: 10 },
];

const eventTypes = [
  { id: 'vulnerability.detected', name: 'Обнаружена уязвимость', color: 'destructive' },
  { id: 'patch.scheduled', name: 'Патч запланирован', color: 'primary' },
  { id: 'patch.started', name: 'Патч запущен', color: 'warning' },
  { id: 'patch.completed', name: 'Патч завершен', color: 'success' },
  { id: 'container.updated', name: 'Контейнер обновлен', color: 'secondary' },
  { id: 'container.created', name: 'Контейнер создан', color: 'info' },
];

const Hooks: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHook, setSelectedHook] = useState<any>(null);
  const [hooks, setHooks] = useState<any[]>(hookData);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hookToDelete, setHookToDelete] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    event: '',
    script: '',
    criteria: '',
    active: true,
    timeout: 30
  });

  // Эффект для установки формы при редактировании
  useEffect(() => {
    if (selectedHook) {
      setFormData({
        name: selectedHook.name,
        event: selectedHook.event,
        script: selectedHook.script,
        criteria: selectedHook.criteria,
        active: selectedHook.active,
        timeout: selectedHook.timeout
      });
    } else {
      setFormData({
        name: '',
        event: '',
        script: '',
        criteria: '',
        active: true,
        timeout: 30
      });
    }
  }, [selectedHook]);

  const openCreateModal = () => {
    setSelectedHook(null);
    setIsModalOpen(true);
  };

  const openEditModal = (hook: any) => {
    setSelectedHook(hook);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openDeleteModal = (hook: any) => {
    setHookToDelete(hook);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setHookToDelete(null);
  };

  const handleDeleteHook = () => {
    if (hookToDelete) {
      setIsLoading(true);
      // Имитация запроса API
      setTimeout(() => {
        setHooks(prev => prev.filter(h => h.id !== hookToDelete.id));
        setIsLoading(false);
        closeDeleteModal();
      }, 800);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Имитация API запроса
    setTimeout(() => {
      if (selectedHook) {
        // Обновление существующего хука
        setHooks(prev => prev.map(h => 
          h.id === selectedHook.id ? { ...h, ...formData } : h
        ));
      } else {
        // Создание нового хука
        const newHook = {
          id: Math.max(...hooks.map(h => h.id)) + 1,
          ...formData
        };
        setHooks(prev => [...prev, newHook]);
      }
      setIsLoading(false);
      closeModal();
    }, 800);
  };

  const getEventName = (eventId: string) => {
    return eventTypes.find(e => e.id === eventId)?.name || eventId;
  };

  const getEventColor = (eventId: string) => {
    const event = eventTypes.find(e => e.id === eventId);
    switch (event?.color) {
      case 'destructive': return 'bg-destructive/20 text-destructive';
      case 'primary': return 'bg-primary/20 text-primary';
      case 'warning': return 'bg-warning/20 text-warning';
      case 'success': return 'bg-success/20 text-success';
      case 'info': return 'bg-blue-500/20 text-blue-500';
      default: return 'bg-secondary/40 text-muted-foreground';
    }
  };

  // Фильтрация хуков
  const filteredHooks = hooks.filter(hook => {
    const matchesSearch = searchTerm === '' || 
      hook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hook.script.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEvent = eventFilter === null || hook.event === eventFilter;
    
    return matchesSearch && matchesEvent;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Хуки</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить хук
        </button>
      </div>

      {/* Поиск и фильтры */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Поиск по имени или скрипту..."
            className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div>
          <select 
            className="p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary"
            value={eventFilter || ''}
            onChange={(e) => setEventFilter(e.target.value === '' ? null : e.target.value)}
          >
            <option value="">Все события</option>
            {eventTypes.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Таблица хуков */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Статус</th>
                <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Имя</th>
                <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Событие</th>
                <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Скрипт</th>
                <th className="py-3 px-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Таймаут</th>
                <th className="py-3 px-3 text-right text-xs uppercase tracking-wider text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredHooks.length > 0 ? (
                filteredHooks.map((hook) => (
                  <tr key={hook.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                    <td className="py-3 px-3">
                      {hook.active ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-primary mr-2" />
                          <span className="text-sm text-primary">Активен</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <AlertCircle className="w-5 h-5 text-muted-foreground mr-2" />
                          <span className="text-sm text-muted-foreground">Отключен</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium">{hook.name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getEventColor(hook.event)}`}>
                        {getEventName(hook.event)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center">
                        <Code className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{hook.script}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{hook.timeout} сек</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(hook)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Изменить
                        </button>
                        <button 
                          className="btn btn-destructive btn-sm"
                          onClick={() => openDeleteModal(hook)}
                        >
                          <Trash className="w-4 h-4 mr-1" />
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <Code className="mx-auto h-10 w-10 mb-2 opacity-30" />
                    <p>Хуки не найдены</p>
                    <p className="text-sm">Попробуйте изменить параметры поиска или создайте новый хук</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно создания/редактирования хука */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {selectedHook ? 'Редактировать хук' : 'Создать хук'}
              </h2>
              <button 
                className="text-muted-foreground hover:text-foreground"
                onClick={closeModal}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">Имя</label>
                <input 
                  type="text" 
                  name="name"
                  className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Событие</label>
                <select 
                  className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary"
                  name="event"
                  value={formData.event}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Выберите событие...</option>
                  {eventTypes.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Путь к скрипту</label>
                <div className="flex">
                  <input 
                    type="text" 
                    name="script"
                    className="flex-1 p-2 bg-secondary border border-border rounded-l-md focus:ring-2 focus:ring-primary"
                    value={formData.script}
                    onChange={handleInputChange}
                    required
                  />
                  <button 
                    type="button"
                    className="p-2 bg-primary text-primary-foreground border border-primary rounded-r-md flex items-center"
                  >
                    <Folder className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Укажите абсолютный путь к файлу скрипта</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Критерии (опционально)</label>
                <input 
                  type="text" 
                  name="criteria"
                  className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary"
                  value={formData.criteria}
                  onChange={handleInputChange}
                  placeholder="Например: severity == 'Critical' && cvss > 7"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Таймаут (секунды)</label>
                <input 
                  type="number" 
                  name="timeout"
                  className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary"
                  value={formData.timeout}
                  onChange={handleInputChange}
                  min="1"
                  max="3600"
                  required
                />
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="active"
                  name="active"
                  className="rounded border-border text-primary focus:ring-primary mr-2" 
                  checked={formData.active}
                  onChange={handleInputChange}
                />
                <label htmlFor="active" className="text-sm font-medium">Активен</label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={isLoading}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {selectedHook ? 'Обновить' : 'Создать'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-lg">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Подтвердите удаление</h2>
              <p className="mb-6 text-muted-foreground">
                Вы уверены, что хотите удалить хук "{hookToDelete?.name}"? Это действие нельзя отменить.
              </p>
              <div className="flex justify-center space-x-3">
                <button 
                  className="btn btn-secondary"
                  onClick={closeDeleteModal}
                  disabled={isLoading}
                >
                  Отмена
                </button>
                <button 
                  className="btn btn-destructive"
                  onClick={handleDeleteHook}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2 animate-spin" />
                      Удаление...
                    </>
                  ) : (
                    <>
                      <Trash className="w-4 h-4 mr-2" />
                      Удалить
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hooks; 
