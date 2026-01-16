
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Loader2, AlertCircle, RefreshCw, Trash2, Edit2, X, Save, Users, Mail, Crown, Check, HelpCircle, XCircle, ExternalLink, MapPin } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { meetingService, MeetingData, MeetingRequest, CalendarStats, MEETING_STATUS_LABELS, MEETING_STATUS_STYLES, MeetingStatusType, parseAttendees, ATTENDEE_STATUS_LABELS, MeetingAttendee } from '../services';
import { googleDriveService } from '../services/api/google-drive.service';
import { Modal, ConfirmModal } from './ui';

const STATUS_COLORS: Record<string, { bg: string, text: string, border: string, dot: string, hover: string, icon: string, avatarInfo: string }> = {
  SCHEDULED: {
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
    dot: 'bg-blue-500', hover: 'hover:bg-blue-50', icon: 'text-blue-600',
    avatarInfo: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  CONFIRMED: {
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    dot: 'bg-emerald-500', hover: 'hover:bg-emerald-50', icon: 'text-emerald-600',
    avatarInfo: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  COMPLETED: {
    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200',
    dot: 'bg-purple-500', hover: 'hover:bg-purple-50', icon: 'text-purple-600',
    avatarInfo: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  NO_SHOW: {
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
    dot: 'bg-amber-500', hover: 'hover:bg-amber-50', icon: 'text-amber-600',
    avatarInfo: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  CANCELLED: {
    bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200',
    dot: 'bg-red-500', hover: 'hover:bg-red-50', icon: 'text-red-600',
    avatarInfo: 'bg-red-100 text-red-700 border-red-200'
  },
  RESCHEDULED: {
    bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200',
    dot: 'bg-cyan-500', hover: 'hover:bg-cyan-50', icon: 'text-cyan-600',
    avatarInfo: 'bg-cyan-100 text-cyan-700 border-cyan-200'
  }
};

const StatusBadge = ({ status }: { status: MeetingStatusType }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.SCHEDULED;
  const label = MEETING_STATUS_LABELS[status] || status;

  return (
    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ml-2 whitespace-nowrap ${colors.bg} ${colors.text} ${colors.border}`}>
      {label}
    </span>
  );
};


const MeetingCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true); // Verificação inicial

  // ... existing states ...

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      setIsCheckingConnection(true);
      try {
        // Check LocalStorage first
        const local = localStorage.getItem('win_google_connected');
        let connected = local === 'true';

        // Verify with API (silent background check)
        try {
          const status = await googleDriveService.getStatus();
          connected = status.connected;
          if (connected) localStorage.setItem('win_google_connected', 'true');
          else localStorage.removeItem('win_google_connected');
        } catch (e) {
          console.error("Failed to verify google status", e);
        }

        setIsGoogleConnected(connected);
        if (connected) {
          await loadCalendarData();
        } else {
          setIsLoading(false); // Stop loading spinner if not connected
        }
      } finally {
        setIsCheckingConnection(false);
      }
    };
    checkAuthAndLoad();
  }, []);

  // Update calendar when date changes (only if connected)
  useEffect(() => {
    if (isGoogleConnected && !isCheckingConnection) {
      loadCalendarData();
    }
  }, [currentDate]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; meetingId: string | null; meetingName: string }>({
    isOpen: false,
    meetingId: null,
    meetingName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [newMeeting, setNewMeeting] = useState<MeetingRequest>({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    meetingDate: format(selectedDate, 'yyyy-MM-dd'),
    meetingTime: '10:00',
    durationMinutes: 30,
    notes: '',
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);
  const padding = Array.from({ length: startDay }, (_, i) => i);



  useEffect(() => {
    setNewMeeting(prev => ({ ...prev, meetingDate: format(selectedDate, 'yyyy-MM-dd') }));
  }, [selectedDate]);

  const loadCalendarData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      const data = await meetingService.getCalendar(startDate, endDate);
      setMeetings(data.meetings);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar reuniões');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await meetingService.createMeeting(newMeeting);
      // Recarregar todos os dados para garantir consistência
      await loadCalendarData();
      setIsCreating(false);
      setNewMeeting({
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        meetingDate: format(selectedDate, 'yyyy-MM-dd'),
        meetingTime: '10:00',
        durationMinutes: 30,
        notes: '',
      });
    } catch (err: any) {
      alert('Erro ao criar reunião: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    setIsSaving(true);
    try {
      const request: MeetingRequest = {
        title: editingMeeting.title,
        contactName: editingMeeting.contactName,
        contactEmail: editingMeeting.contactEmail || undefined,
        contactPhone: editingMeeting.contactPhone || undefined,
        meetingDate: editingMeeting.meetingDate,
        meetingTime: editingMeeting.meetingTime,
        durationMinutes: editingMeeting.durationMinutes,
        notes: editingMeeting.notes || undefined,
        status: editingMeeting.status,
      };
      const updated = await meetingService.updateMeeting(editingMeeting.id, request);
      await loadCalendarData();
      setEditingMeeting(null);
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = (meeting: MeetingData) => {
    setDeleteConfirm({ isOpen: true, meetingId: meeting.id, meetingName: meeting.contactName });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.meetingId) return;
    setIsDeleting(true);
    try {
      await meetingService.deleteMeeting(deleteConfirm.meetingId);
      await loadCalendarData();
      setDeleteConfirm({ isOpen: false, meetingId: null, meetingName: '' });
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(m => isSameDay(new Date(m.meetingDate), date));
  };

  const selectedDateMeetings = getMeetingsForDate(selectedDate);

  if (isLoading && meetings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-emerald-600" />
          <p className="text-gray-500 font-medium">Carregando calendário...</p>
        </div>
      </div>
    );
  }

  if (error && meetings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-sm text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Erro ao carregar</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={loadCalendarData}
            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw size={18} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {(!isGoogleConnected && !isCheckingConnection) && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center min-h-[80vh]">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 max-w-md text-center animate-in zoom-in-50 duration-300">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarIcon size={40} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tighter uppercase italic">Conexão Necessária</h2>
            <p className="text-gray-500 mb-8 font-medium">
              Para gerenciar sua agenda comercial e permitir que a IA agende reuniões, conecte seu Google Calendar.
            </p>
            <button
              onClick={() => window.location.hash = '#/configuracoes'}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 uppercase text-xs tracking-widest"
            >
              Conectar Google Calendar
            </button>
          </div>
        </div>
      )}

      <div className={`space-y-6 transition-all duration-500 ${!isGoogleConnected ? 'blur-sm opacity-50 pointer-events-none select-none' : ''}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tighter">Calendário de Reuniões</h1>
            <p className="text-gray-500 mt-1">Visualize as reuniões agendadas pelo agente SDR.</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="bg-emerald-50 text-emerald-600 font-bold px-4 py-2 rounded-xl text-sm hover:bg-emerald-100 transition-all"
            >
              Hoje
            </button>
            <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 text-gray-400 transition-colors border-r border-gray-100">
                <ChevronLeft size={18} />
              </button>
              <span className="px-6 py-2 text-sm font-black text-gray-800 uppercase tracking-tight">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 text-gray-400 transition-colors border-l border-gray-100">
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Plus size={18} />
              Criar Evento
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
                <div key={day} className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 h-[600px]">
              {padding.map((_, i) => (
                <div key={`p-${i}`} className="border-r border-b border-gray-50 bg-gray-50/20"></div>
              ))}
              {days.map((day) => {
                const dayMeetings = getMeetingsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);

                return (
                  <div
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`border-r border-b border-gray-50 p-3 min-h-[100px] hover:bg-emerald-50/30 transition-all cursor-pointer relative ${isSelected ? 'bg-emerald-50/50' : ''}`}
                  >
                    <span className={`text-xs font-bold ${isToday ? 'bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center' : isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-200'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-2 space-y-1">
                      {dayMeetings.slice(0, 2).map(m => {
                        const colors = STATUS_COLORS[m.status] || STATUS_COLORS.SCHEDULED;
                        const attendeesCount = m.attendeesCount || 0;
                        return (
                          <div key={m.id} className={`${colors.bg} p-1.5 rounded-lg border-l-4 ${colors.border.replace('border', 'border-l')} flex items-center gap-1.5 overflow-hidden`}>
                            <div className={`w-1.5 h-1.5 ${colors.dot} rounded-full flex-shrink-0`}></div>
                            <span className={`text-[10px] font-bold ${colors.text} truncate flex-1`} title={m.title || m.contactName}>
                              {m.title || m.contactName}
                            </span>
                            {attendeesCount > 0 && (
                              <span className={`text-[8px] ${colors.text} opacity-60 flex items-center gap-0.5`} title={`${attendeesCount} participante(s)`}>
                                <Users size={8} />
                                {attendeesCount}
                              </span>
                            )}
                            <span className={`text-[9px] ${colors.text} font-bold opacity-70`}>{m.meetingTimeFormatted}</span>
                          </div>
                        );
                      })}
                      {dayMeetings.length > 2 && (
                        <span className="text-[9px] font-bold text-gray-400">+{dayMeetings.length - 2} mais</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="xl:col-span-1 space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="text-emerald-600" size={20} />
                <h3 className="text-base font-black text-gray-800 tracking-tight">Agenda do Dia</h3>
                <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{format(selectedDate, "dd MMM", { locale: ptBR })}</span>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {selectedDateMeetings.length > 0 ? (
                  selectedDateMeetings.map(m => {
                    const colors = STATUS_COLORS[m.status] || STATUS_COLORS.SCHEDULED;
                    const attendees = parseAttendees(m.attendeesJson);
                    const attendeesCount = attendees.length;

                    return (
                      <div key={m.id} className="group bg-white p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => setEditingMeeting(m)}>
                        {/* Header */}
                        <div className="flex items-start gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg ${colors.avatarInfo} flex items-center justify-center font-bold text-xs shrink-0`}>
                            {(m.title || m.contactName).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-xs truncate" title={m.title || m.contactName}>
                              {m.title || m.contactName}
                            </h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-[9px] font-bold ${colors.text}`}>{m.meetingTimeFormatted}</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-[9px] text-gray-400">{m.durationMinutes}min</span>
                            </div>
                          </div>
                          <StatusBadge status={m.status} />
                        </div>

                        {/* Info Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {m.source === 'Google Calendar' && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                              Google
                            </span>
                          )}
                          {attendeesCount > 0 && (
                            <span className="text-[9px] text-gray-400 flex items-center gap-1">
                              <Users size={10} />
                              {attendeesCount} participante{attendeesCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {m.contactEmail && (
                            <span className="text-[9px] text-gray-400 flex items-center gap-1 truncate max-w-[120px]" title={m.contactEmail}>
                              <Mail size={9} />
                              <span className="truncate">{m.contactEmail}</span>
                            </span>
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className="hidden group-hover:flex items-center gap-1 mt-2 pt-2 border-t border-gray-50">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingMeeting(m); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <Edit2 size={10} /> Ver Detalhes
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDeleteConfirm(m); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-400 text-sm font-medium">Nenhuma reunião para este dia.</p>
                    <button
                      onClick={() => setIsCreating(true)}
                      className="mt-4 text-emerald-600 text-xs font-bold flex items-center gap-1 mx-auto"
                    >
                      <Plus size={14} /> Agendar reunião
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#003d2b] p-8 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-emerald-400" />
                Estatísticas
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Taxa de Show-up</span>
                  <span className="text-xl font-black text-white">{stats?.showUpRate || 0}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${stats?.showUpRate || 0}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {stats?.showUpRate && stats.showUpRate >= 80
                    ? 'Suas reuniões estão com alta taxa de comparecimento devido à qualificação prévia da IA.'
                    : stats?.showUpRate && stats.showUpRate >= 50
                      ? 'Taxa de comparecimento moderada. Considere melhorar a qualificação de leads.'
                      : 'Ainda não há dados suficientes para análise.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, meetingId: null, meetingName: '' })}
          onConfirm={handleDelete}
          title="Excluir Reunião"
          message={`Tem certeza que deseja excluir a reunião com "${deleteConfirm.meetingName}"?`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          variant="danger"
          isLoading={isDeleting}
        />

        {/* Create Modal */}
        <Modal
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          title="Nova Reunião"
          subtitle="Agendar"
        >
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome do Contato *</label>
              <input
                type="text"
                required
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                value={newMeeting.contactName}
                onChange={(e) => setNewMeeting({ ...newMeeting, contactName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">E-mail</label>
                <input
                  type="email"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                  value={newMeeting.contactEmail}
                  onChange={(e) => setNewMeeting({ ...newMeeting, contactEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Telefone</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                  value={newMeeting.contactPhone}
                  onChange={(e) => setNewMeeting({ ...newMeeting, contactPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Data *</label>
                <input
                  type="date"
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                  value={newMeeting.meetingDate}
                  onChange={(e) => setNewMeeting({ ...newMeeting, meetingDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Horário *</label>
                <input
                  type="time"
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                  value={newMeeting.meetingTime}
                  onChange={(e) => setNewMeeting({ ...newMeeting, meetingTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Notas</label>
              <textarea
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm h-24 resize-none"
                value={newMeeting.notes}
                onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 px-8 py-5 border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-8 py-5 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Agendar
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={!!editingMeeting}
          onClose={() => setEditingMeeting(null)}
          title="Detalhes da Reunião"
          subtitle={editingMeeting?.source === 'Google Calendar' ? 'Sincronizado do Google Calendar' : 'Evento Manual'}
        >
          {editingMeeting && (() => {
            const attendees = parseAttendees(editingMeeting.attendeesJson);
            const organizer = attendees.find(a => a.status === 'organizer');
            const participants = attendees.filter(a => a.status !== 'organizer');

            return (
              <form onSubmit={handleEdit} className="space-y-5">
                {/* Fonte do evento */}
                {editingMeeting.source === 'Google Calendar' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2">
                    <CalendarIcon size={16} className="text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">
                      Este evento foi sincronizado do Google Calendar
                    </span>
                  </div>
                )}

                {/* Título */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Título do Evento</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                    value={editingMeeting.title || ''}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, title: e.target.value })}
                    placeholder="Título da reunião"
                  />
                </div>

                {/* Contato Principal */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Contato Principal</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                    value={editingMeeting.contactName}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, contactName: e.target.value })}
                  />
                </div>

                {/* E-mail e Telefone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">E-mail</label>
                    <input
                      type="email"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                      value={editingMeeting.contactEmail || ''}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, contactEmail: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Telefone</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                      value={editingMeeting.contactPhone || ''}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, contactPhone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                {/* Data, Horário e Duração */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Data</label>
                    <input
                      type="date"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                      value={editingMeeting.meetingDate}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, meetingDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Horário</label>
                    <input
                      type="time"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                      value={editingMeeting.meetingTime}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, meetingTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Duração</label>
                    <select
                      className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                      value={editingMeeting.durationMinutes}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, durationMinutes: parseInt(e.target.value) })}
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hora</option>
                      <option value={90}>1h 30min</option>
                      <option value={120}>2 horas</option>
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Status da Reunião</label>
                  <select
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest"
                    value={editingMeeting.status}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, status: e.target.value as MeetingStatusType })}
                  >
                    {Object.entries(MEETING_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Organizador (apenas leitura se sincronizado) */}
                {organizer && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 flex items-center gap-1">
                      <Crown size={10} className="text-blue-500" />
                      Organizador
                    </label>
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {(organizer.name || organizer.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-700 truncate">{organizer.name || organizer.email}</p>
                        <p className="text-[10px] text-gray-400 truncate">{organizer.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de Participantes (apenas leitura se sincronizado) */}
                {participants.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 flex items-center gap-1">
                      <Users size={10} />
                      Participantes ({participants.length})
                    </label>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2 max-h-[160px] overflow-y-auto">
                      {participants.map((attendee, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-50">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${attendee.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                            attendee.status === 'declined' ? 'bg-red-100 text-red-700' :
                              attendee.status === 'tentative' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                            }`}>
                            {(attendee.name || attendee.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{attendee.name || attendee.email}</p>
                            <p className="text-[10px] text-gray-400 truncate">{attendee.email}</p>
                          </div>
                          <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${attendee.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                            attendee.status === 'declined' ? 'bg-red-100 text-red-700' :
                              attendee.status === 'tentative' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-500'
                            }`}>
                            {ATTENDEE_STATUS_LABELS[attendee.status] || attendee.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link da Reunião */}
                {editingMeeting.meetingLink && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Link da Reunião</label>
                    <a
                      href={editingMeeting.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink size={16} />
                      <span className="text-sm font-medium truncate">{editingMeeting.meetingLink}</span>
                    </a>
                  </div>
                )}

                {/* Notas */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Notas</label>
                  <textarea
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm h-20 resize-none"
                    value={editingMeeting.notes || ''}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, notes: e.target.value })}
                    placeholder="Anotações sobre a reunião..."
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingMeeting(null)}
                    className="flex-1 px-6 py-4 border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-6 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            );
          })()}
        </Modal>
      </div>
    </div>
  );
};

export default MeetingCalendar;
