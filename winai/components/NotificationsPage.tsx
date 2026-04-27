import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle, ChevronLeft } from 'lucide-react';
import { notificationService } from '../services/api/notification.service';
import { NotificationDTO } from '../services/types';

/**
 * Página dedicada de notificações (rota /notificacoes; acesso por URL ou links internos).
 */
const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      await loadNotifications();
    } catch (error) {
      console.error('Erro ao marcar como lida', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.delete(id);
      await loadNotifications();
    } catch (error) {
      console.error('Erro ao deletar notificação', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle size={18} className="text-emerald-600" />;
      case 'WARNING':
        return <AlertTriangle size={18} className="text-amber-600" />;
      case 'ERROR':
        return <AlertCircle size={18} className="text-rose-600" />;
      default:
        return <Info size={18} className="text-blue-600" />;
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

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/80">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 mb-8"
        >
          <ChevronLeft size={14} />
          Voltar ao dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Bell size={28} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Notificações</h1>
              <p className="text-sm text-gray-500 font-medium">Alertas do sistema, handoff humano e outras mensagens.</p>
            </div>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors"
            >
              <CheckCheck size={16} />
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              <p className="text-gray-500 text-sm mt-4 font-medium">Carregando…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center">
              <Bell size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Nenhuma notificação no momento.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`p-5 hover:bg-gray-50/80 transition-colors ${getBgColor(notification.type, notification.read)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 shrink-0">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notification.message}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
                          {formatDate(notification.createdAt)}
                        </span>
                        {notification.actionUrl && notification.actionUrl.startsWith('/') && (
                          <Link
                            to={notification.actionUrl}
                            className="text-[10px] text-emerald-600 font-black uppercase tracking-wider hover:underline"
                          >
                            Abrir conversa
                          </Link>
                        )}
                        {notification.actionUrl && !notification.actionUrl.startsWith('/') && (
                          <a
                            href={notification.actionUrl}
                            className="text-[10px] text-emerald-600 font-black uppercase tracking-wider hover:underline"
                          >
                            Abrir link
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!notification.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-emerald-600 transition-colors rounded-lg hover:bg-white"
                          title="Marcar como lida"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(notification.id)}
                        className="p-2 text-gray-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-white"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
