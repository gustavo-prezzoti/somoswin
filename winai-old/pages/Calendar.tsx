import React, { useState, useMemo, Fragment, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, User, Mail, Phone, ExternalLink, Plus, X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import { Lead, User as TeamUser } from '../types/database.types';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';


const EventDetailsModal: React.FC<{ event: Lead | null; onClose: () => void; users: TeamUser[] }> = ({ event, onClose, users }) => {
    const navigate = useNavigate();
    if (!event) return null;
    
    const assignedUser = users.find(u => u.id === event.assigned_to);

    const handleViewInCrm = () => {
        navigate('/crm', { state: { leadId: event.id } });
        onClose();
    };

    return (
        <Modal isOpen={!!event} onClose={onClose} title="Detalhes da Reunião">
            <div className="space-y-4">
                <div>
                    <p className="text-sm text-gray-500">Reunião com</p>
                    <h3 className="text-xl font-bold text-emerald-900">{event.name}</h3>
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-700">
                        {format(new Date(event.meeting_date!), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        {event.meeting_time}
                    </p>
                </div>
                <div className="border-t pt-4 space-y-3">
                    {assignedUser && (
                         <div className="flex items-center gap-3">
                            <img src={assignedUser.avatar_url} alt={assignedUser.full_name} className="w-8 h-8 rounded-full"/>
                            <div>
                                <p className="text-xs text-gray-500">Responsável</p>
                                <p className="text-sm font-medium text-gray-800">{assignedUser.full_name}</p>
                            </div>
                        </div>
                    )}
                     <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                        <div>
                            <p className="text-xs text-gray-500">E-mail</p>
                            <a href={`mailto:${event.email}`} className="text-sm font-medium text-emerald-700 hover:underline">{event.email}</a>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                        <div>
                            <p className="text-xs text-gray-500">Telefone</p>
                            <a href={`tel:${event.phone}`} className="text-sm font-medium text-emerald-700 hover:underline">{event.phone}</a>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" onClick={handleViewInCrm}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver Lead no CRM
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

const AddEventModal: React.FC<{ isOpen: boolean; onClose: () => void; day: Date | null, leads: Lead[], users: TeamUser[] }> = ({ isOpen, onClose, day, leads, users }) => {
    const [eventDate, setEventDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (day) {
                setEventDate(format(day, 'yyyy-MM-dd'));
            } else {
                setEventDate('');
            }
        }
    }, [day, isOpen]);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Agendar Nova Reunião">
             <form className="space-y-4" onSubmit={e => { e.preventDefault(); alert('Evento criado (demo)'); onClose(); }}>
                <div>
                    <label className="text-sm font-medium text-gray-700">Lead</label>
                    <Select className="w-full mt-1">
                        <option>Selecione um lead</option>
                        {leads.map(lead => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
                    </Select>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">Data</label>
                    <Input 
                        type="date" 
                        className="mt-1" 
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="text-sm font-medium text-gray-700">Horário</label>
                        <Input type="time" className="mt-1" required/>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Responsável</label>
                        <Select className="w-full mt-1">
                             {users.map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Agendar</Button>
                </div>
            </form>
        </Modal>
    )
}

const DayEventsSidebar: React.FC<{ day: Date; events: Lead[]; onClose: () => void; onEventClick: (event: Lead) => void; onAddEvent: (day: Date) => void; }> = ({ day, events, onClose, onEventClick, onAddEvent }) => {
    return (
        <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">
            <div className="p-4 flex justify-between items-center border-b">
                <h3 className="font-bold text-lg text-emerald-900 capitalize">{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h3>
                <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar"><X className="w-5 h-5"/></Button>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {events.length > 0 ? events.sort((a,b) => (a.meeting_time || '').localeCompare(b.meeting_time || '')).map(event => (
                    <button key={event.id} onClick={() => onEventClick(event)} className="w-full text-left p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <p className="font-bold text-emerald-800">{event.name}</p>
                        <p className="text-sm text-emerald-700 flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4" />
                            {event.meeting_time}
                        </p>
                    </button>
                )) : (
                    <div className="text-center text-gray-500 pt-10">
                        <CalendarIcon className="w-12 h-12 mx-auto text-gray-300"/>
                        <p className="mt-2 font-medium">Nenhuma reunião agendada.</p>
                        <p className="text-sm">Clique abaixo para adicionar uma.</p>
                    </div>
                )}
            </div>
            <div className="p-4 border-t">
                <Button className="w-full" onClick={() => onAddEvent(day)}>
                    <Plus className="w-4 h-4 mr-2"/>
                    Adicionar Reunião
                </Button>
            </div>
        </div>
    )
}


const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: leadData, isLoading } = useLeads();
  
  const [selectedEventDetails, setSelectedEventDetails] = useState<Lead | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [dayForNewEvent, setDayForNewEvent] = useState<Date | null>(null);

  const scheduledEvents = useMemo(() => {
    if (!leadData?.leads) return [];
    return leadData.leads.filter(lead => lead.status === 'meeting_scheduled' && lead.meeting_date);
  }, [leadData]);

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  
  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(firstDayOfMonth, { weekStartsOn: 0 }),
    end: endOfWeek(lastDayOfMonth, { weekStartsOn: 0 }),
  });

  const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };
  
  const handleOpenAddEvent = (day: Date | null) => {
    setDayForNewEvent(day);
    setIsAddEventModalOpen(true);
    setSelectedDay(null); // Close sidebar when modal opens
  }
  
  const eventsByDate = useMemo(() => {
      const map = new Map<string, Lead[]>();
      scheduledEvents.forEach(event => {
          const date = format(new Date(event.meeting_date!), 'yyyy-MM-dd');
          if (!map.has(date)) {
              map.set(date, []);
          }
          map.get(date)!.push(event);
      });
      return map;
  }, [scheduledEvents]);

  const MAX_EVENTS_VISIBLE = 2;


  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 font-sans">
      <EventDetailsModal event={selectedEventDetails} onClose={() => setSelectedEventDetails(null)} users={leadData?.users || []} />
      <AddEventModal isOpen={isAddEventModalOpen} onClose={() => setIsAddEventModalOpen(false)} day={dayForNewEvent} leads={leadData?.leads || []} users={leadData?.users || []} />
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
            <h1 className="text-3xl font-bold text-emerald-900">Calendário de Reuniões</h1>
            <p className="text-gray-600">Visualize as reuniões agendadas pelo agente SDR.</p>
        </div>
        <div className="flex items-center gap-3">
             <Button onClick={goToToday} variant="secondary">Hoje</Button>
            <div className="flex items-center gap-1 p-1 bg-white border rounded-lg">
                <button onClick={prevMonth} className="p-2 rounded-md text-gray-600 hover:bg-gray-100" aria-label="Mês anterior"><ChevronLeft className="h-5 w-5" /></button>
                <h2 className="text-base font-bold text-emerald-800 capitalize w-36 text-center">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </h2>
                <button onClick={nextMonth} className="p-2 rounded-md text-gray-600 hover:bg-gray-100" aria-label="Próximo mês"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <Button onClick={() => handleOpenAddEvent(null)}><Plus className="w-4 h-4"/><span>Criar Evento</span></Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="grid grid-cols-7 border-b border-gray-200">
            {weekDays.map(day => (
                <div key={day} className="py-3 text-center text-xs font-bold text-emerald-800 uppercase tracking-wider">
                {day}
                </div>
            ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-6 flex-1 h-full">
            {daysInMonth.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const eventsForDay = eventsByDate.get(dayKey)?.sort((a,b) => (a.meeting_time || '').localeCompare(b.meeting_time || '')) || [];
                const hiddenEventsCount = eventsForDay.length - MAX_EVENTS_VISIBLE;

                return (
                <div
                    key={day.toString()}
                    onClick={() => handleDayClick(day)}
                    className={`p-2 border-r border-b border-gray-100 flex flex-col cursor-pointer transition-colors hover:bg-emerald-50/50 relative ${
                    !isSameMonth(day, currentDate) ? 'bg-gray-50' : ''
                    }`}
                >
                    <span className={`text-sm self-end font-medium h-7 w-7 flex items-center justify-center rounded-full ${
                    isToday(day) ? 'bg-emerald-600 text-white' : isSameMonth(day, currentDate) ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                    {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-1 overflow-hidden">
                        {eventsForDay.slice(0, MAX_EVENTS_VISIBLE).map(event => (
                            <button
                                key={event.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedEventDetails(event); }}
                                className="w-full text-left p-1.5 rounded text-xs transition-colors"
                            >
                                <p className="flex items-center gap-1.5 font-semibold text-emerald-900 truncate">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></span>
                                    {event.name}
                                </p>
                                <p className="text-emerald-700 pl-3.5">{event.meeting_time}</p>
                            </button>
                        ))}
                         {hiddenEventsCount > 0 && (
                            <div className="text-xs font-semibold text-emerald-700 p-1.5 rounded hover:bg-emerald-100">
                                +{hiddenEventsCount} mais
                            </div>
                        )}
                    </div>
                </div>
                )
            })}
            </div>
        </div>

        {selectedDay && (
            <DayEventsSidebar 
                day={selectedDay}
                events={eventsByDate.get(format(selectedDay, 'yyyy-MM-dd')) || []}
                onClose={() => setSelectedDay(null)}
                onEventClick={(event) => setSelectedEventDetails(event)}
                onAddEvent={handleOpenAddEvent}
            />
        )}
      </div>
    </div>
  );
};

export default Calendar;