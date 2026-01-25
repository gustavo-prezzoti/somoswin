
import React, { useState } from 'react';
import { Play, Star, Clock, ChevronLeft, ChevronRight, Info, Filter } from 'lucide-react';

const VideoCard = ({ video }: any) => (
  <div className="flex-none w-72 group cursor-pointer">
    <div className="relative aspect-video rounded-xl overflow-hidden mb-3 border border-gray-100 shadow-sm transition-transform duration-300 group-hover:scale-[1.05] group-hover:shadow-2xl group-hover:border-emerald-500 z-10">
      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
         <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-lg">
           <Play size={24} className="ml-1" />
         </div>
      </div>
      <div className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-white backdrop-blur-sm">
        {video.duration}
      </div>
    </div>
    <div className="flex justify-between items-start">
      <h4 className="text-sm font-bold text-gray-800 group-hover:text-emerald-600 transition-colors line-clamp-1">{video.title}</h4>
      <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
        {video.relevance}
      </div>
    </div>
    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">MASTERCLASS</p>
  </div>
);

const Section = ({ title, videos }: any) => (
  <div className="space-y-4 px-4">
    <div className="flex items-center justify-between">
      <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">{title}</h3>
      <div className="flex gap-2">
         <button className="p-2 bg-white border border-gray-100 rounded-full shadow-sm hover:text-emerald-600"><ChevronLeft size={16} /></button>
         <button className="p-2 bg-white border border-gray-100 rounded-full shadow-sm hover:text-emerald-600"><ChevronRight size={16} /></button>
      </div>
    </div>
    <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar no-scrollbar scroll-smooth">
      {videos.map((v: any) => <VideoCard key={v.id} video={v} />)}
    </div>
  </div>
);

const Academy: React.FC = () => {
  const sections = [
    { title: "Vendas e Persuasão", videos: [
      { id: 1, title: 'Fechamento Executivo', duration: '04:35', relevance: '99%', thumbnail: 'https://picsum.photos/seed/v1/400/225' },
      { id: 2, title: 'Linguagem Corporal', duration: '05:31', relevance: '95%', thumbnail: 'https://picsum.photos/seed/v2/400/225' },
      { id: 3, title: 'Scripts de Alto Ticket', duration: '05:55', relevance: '91%', thumbnail: 'https://picsum.photos/seed/v3/400/225' },
      { id: 4, title: 'Prospecção Ativa', duration: '04:42', relevance: '88%', thumbnail: 'https://picsum.photos/seed/v4/400/225' }
    ]},
    { title: "Domínio do WhatsApp", videos: [
      { id: 5, title: 'Áudios que Vendem', duration: '05:24', relevance: '97%', thumbnail: 'https://picsum.photos/seed/w1/400/225' },
      { id: 6, title: 'Listas de Qualificação', duration: '04:28', relevance: '93%', thumbnail: 'https://picsum.photos/seed/w2/400/225' },
      { id: 7, title: 'Status como Funil', duration: '04:22', relevance: '90%', thumbnail: 'https://picsum.photos/seed/w3/400/225' }
    ]},
    { title: "Estratégias de Growth", videos: [
      { id: 9, title: 'Escalando com IA', duration: '04:13', relevance: '98%', thumbnail: 'https://picsum.photos/seed/g1/400/225' },
      { id: 10, title: 'Otimização de ROI', duration: '05:36', relevance: '94%', thumbnail: 'https://picsum.photos/seed/g2/400/225' },
      { id: 11, title: 'Análise de Audiência', duration: '05:39', relevance: '89%', thumbnail: 'https://picsum.photos/seed/g3/400/225' }
    ]}
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
       <div className="relative h-[500px] rounded-[56px] overflow-hidden group shadow-2xl">
          <img src="https://picsum.photos/seed/netflix/1280/720" className="w-full h-full object-cover brightness-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#003d2b] via-[#003d2b]/20 to-transparent"></div>
          <div className="absolute bottom-12 left-12 max-w-2xl space-y-6">
             <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full w-fit font-black text-[10px] uppercase tracking-widest shadow-lg">LANÇAMENTO</div>
             <h1 className="text-6xl font-black text-white tracking-tighter leading-none italic">A Mente <br /> Vendedora</h1>
             <p className="text-emerald-50 text-lg font-medium leading-relaxed">Uma jornada profunda na psicologia do fechamento para transformar qualquer 'não' em oportunidade.</p>
             <div className="flex gap-4">
                <button className="bg-white text-[#003d2b] font-black px-10 py-5 rounded-2xl flex items-center gap-3 hover:scale-105 transition-all shadow-2xl">
                   <Play size={20} className="fill-[#003d2b]" /> Começar Aula
                </button>
             </div>
          </div>
       </div>

       <div className="flex items-center gap-4 px-4 overflow-x-auto pb-4 no-scrollbar">
          {['Todos', 'Vendas', 'WhatsApp', 'Growth', 'Tráfego', 'IA', 'Mindset'].map(cat => (
             <button key={cat} className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:bg-emerald-600 hover:text-white hover:shadow-xl transition-all">{cat}</button>
          ))}
       </div>

       <div className="space-y-16">
          {sections.map((s, i) => <Section key={i} title={s.title} videos={s.videos} />)}
       </div>
    </div>
  );
};

export default Academy;
