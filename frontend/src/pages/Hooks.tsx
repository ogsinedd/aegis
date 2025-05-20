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
import axios from 'axios';

// Типы данных
interface Hook {
  id: number;
  name: string;
  type: string;
  script: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  type: string;
  script: string;
  enabled: boolean;
}

const eventTypes = [
  { id: 'on_detect', name: 'Обнаружена уязвимость', color: 'destructive' },
  { id: 'pre_patch', name: 'Перед применением патча', color: 'primary' },
  { id: 'post_patch', name: 'После применения патча', color: 'warning' },
  { id: 'on_failure', name: 'При ошибке', color: 'success' },
  { id: 'on_rollback', name: 'При откате', color: 'secondary' },
];

const Hooks: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHook, setSelectedHook] = useState<Hook | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hookToDelete, setHookToDelete] = useState<Hook | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    script: '',
    enabled: true
  });

  // Загрузка данных с сервера
  useEffect(() => {
    fetchHooks();
  }, []);

  const fetchHooks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get('/v1/hooks');
      setHooks(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке хуков:', err);
      setError('Не удалось загрузить данные. Попробуйте еще раз позже.');
    } finally {
      setIsLoading(false);
    }
  };

  // Эффект для установки формы при редактировании
  useEffect(() => {
    if (selectedHook) {
      setFormData({
        name: selectedHook.name,
        type: selectedHook.type,
        script: selectedHook.script,
        enabled: selectedHook.enabled
      });
    } else {
      setFormData({
        name: '',
        type: '',
        script: '',
        enabled: true
      });
    }
  }, [selectedHook]);

  const openCreateModal = () => {
    setSelectedHook(null);
    setIsModalOpen(true);
  };

  const openEditModal = (hook: Hook) => {
    setSelectedHook(hook);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openDeleteModal = (hook: Hook) => {
    setHookToDelete(hook);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setHookToDelete(null);
  };

  const handleDeleteHook = async () => {
    if (hookToDelete) {
      setIsLoading(true);
      try {
        await axios.delete(`/v1/hooks/${hookToDelete.id}`);
        setHooks(prev => prev.filter(h => h.id !== hookToDelete.id));
        closeDeleteModal();
      } catch (err) {
        console.error('Ошибка при удалении хука:', err);
        setError('Не удалось удалить хук. Попробуйте еще раз позже.');
      } finally {
        setIsLoading(false);
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (selectedHook) {
        // Обновление существующего хука
        await axios.put(`/v1/hooks/${selectedHook.id}`, formData);
        setHooks(prev => prev.map(h => 
          h.id === selectedHook.id ? { ...h, ...formData } : h
        ));
      } else {
        // Создание нового хука
        const response = await axios.post('/v1/hooks', formData);
        setHooks(prev => [...prev, response.data]);
      }
      closeModal();
    } catch (err) {
      console.error('Ошибка при сохранении хука:', err);
      setError('Не удалось сохранить хук. Проверьте введенные данные.');
    } finally {
      setIsLoading(false);
    }
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
    
    const matchesEvent = eventFilter === null || hook.type === eventFilter;
    
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

      {/* Сообщение об ошибке */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

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
                <th className="py-3 px-3 text-right text-xs uppercase tracking-wider text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && hooks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    <div className="loading-spinner mx-auto mb-4" />
                    <p>Загрузка данных...</p>
                  </td>
                </tr>
              ) : filteredHooks.length > 0 ? (
                filteredHooks.map((hook) => (
                  <tr key={hook.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                    <td className="py-3 px-3">
                      {hook.enabled ? (
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
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getEventColor(hook.type)}`}>
                        {getEventName(hook.type)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center">
                        <Code className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{hook.script}</span>
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
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
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
                  name="type"
                  value={formData.type}
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
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="enabled"
                  name="enabled"
                  className="rounded border-border text-primary focus:ring-primary mr-2" 
                  checked={formData.enabled}
                  onChange={handleInputChange}
                />
                <label htmlFor="enabled" className="text-sm font-medium">Активен</label>
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
