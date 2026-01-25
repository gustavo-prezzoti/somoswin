
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, ArrowUpRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MeetingCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // Dezembro 2025
  const [selectedDate, setSelectedDate] = useState(new Date(2025, 11, 29));

  const meetings = [
    { id: 1, name: 'Kevin Miranda', time: '16:00', date: new Date(2025, 11, 23) },
    { id: 2, name: 'Samuel Costa', time: '11:00', date: new Date(2025, 11, 27) },
    { id: 3, name: 'Nicole Castro', time: '15:30', date: new Date(2025, 11, 29) },
    { id: 4, name: 'Beatriz Mendes', time: '09:00', date: new Date(2025, 11, 29) },
  ];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add empty slots for the first week
  const startDay = getDay(monthStart);
  const padding = Array.from({ length: startDay }, (_, i) => i);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tighter">Calendário de Reuniões</h1>
          <p className="text-gray-500 mt-1">Visualize as reuniões agendadas pelo agente SDR.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-emerald-50 text-emerald-600 font-bold px-4 py-2 rounded-xl text-sm hover:bg-emerald-100 transition-all">Hoje</button>
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
          <button className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
            <Plus size={18} />
            Criar Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
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
              const dayMeetings = meetings.filter(m => isSameDay(m.date, day));
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
                    {dayMeetings.map(m => (
                      <div key={m.id} className="bg-emerald-100/50 p-1.5 rounded-lg border-l-4 border-emerald-500 flex items-center gap-2 overflow-hidden">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0"></div>
                        <span className="text-[10px] font-bold text-emerald-800 truncate">{m.name}</span>
                        <span className="text-[9px] text-emerald-600 font-bold ml-auto">{m.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <CalendarIcon className="text-emerald-600" size={24} />
                <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase">Agenda do Dia</h3>
              </div>
              <div className="space-y-6">
                 {meetings.filter(m => isSameDay(m.date, selectedDate)).length > 0 ? (
                    meetings.filter(m => isSameDay(m.date, selectedDate)).map(m => (
                      <div key={m.id} className="group cursor-pointer">
                        <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-600">
                             {m.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                             <div className="flex items-center justify-between mb-1">
                               <h4 className="font-bold text-gray-800 text-sm">{m.name}</h4>
                               <ArrowUpRight size={14} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                             </div>
                             <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                               <div className="flex items-center gap-1">
                                 <Clock size={12} />
                                 {m.time}
                               </div>
                               <div className="flex items-center gap-1">
                                 <User size={12} />
                                 IA Agendou
                               </div>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))
                 ) : (
                   <div className="text-center py-10">
                      <p className="text-gray-400 text-sm font-medium">Nenhuma reunião para este dia.</p>
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
                  <span className="text-xl font-black text-white">92%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-[92%]"></div>
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">Suas reuniões estão com alta taxa de comparecimento devido à qualificação prévia da IA.</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingCalendar;
