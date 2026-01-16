import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { notificationService } from '../services/api/notification.service';
import { NotificationDTO } from '../services/types';

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch (error) {
      console.error('Erro ao carregar notificações', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Erro ao carregar contagem de não lidas', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Erro ao marcar como lida', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.delete(id);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Erro ao deletar notificação', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle size={16} className="text-emerald-600" />;
      case 'WARNING':
        return <AlertTriangle size={16} className="text-amber-600" />;
      case 'ERROR':
        return <AlertCircle size={16} className="text-rose-600" />;
      default:
        return <Info size={16} className="text-blue-600" />;
    }
  };

  const getBgColor = (type: string, read: boolean) => {
    if (read) return 'bg-white';
    switch (type) {
      case 'SUCCESS':
        return 'bg-emerald-50';
      case 'WARNING':
        return 'bg-amber-50';
      case 'ERROR':
        return 'bg-rose-50';
      default:
        return 'bg-blue-50';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={dropdownRef}
        className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-[600px] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-gray-600" />
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Notificações</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
              >
                Marcar todas como lidas
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              <p className="text-gray-500 text-sm mt-2">Carregando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${getBgColor(notification.type, notification.read)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-gray-400 font-medium">
                              {formatDate(notification.createdAt)}
                            </span>
                            {notification.actionUrl && (
                              <a
                                href={notification.actionUrl}
                                className="text-[10px] text-emerald-600 font-bold hover:underline uppercase tracking-wider"
                                onClick={onClose}
                              >
                                Ver detalhes
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors"
                              title="Marcar como lida"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors"
                            title="Deletar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Notifications;

