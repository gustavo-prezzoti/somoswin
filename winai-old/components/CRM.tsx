
import React, { useState } from 'react';
import { Search, Filter, Plus, Edit2, ChevronRight, X, Save, User } from 'lucide-react';
import { LeadStatus, Lead } from '../types';
import { MOCK_LEADS } from '../constants';

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    [LeadStatus.NEW]: 'bg-blue-50 text-blue-600 border-blue-100',
    [LeadStatus.CONTACTED]: 'bg-amber-50 text-amber-600 border-amber-100',
    [LeadStatus.QUALIFIED]: 'bg-purple-50 text-purple-600 border-purple-100',
    [LeadStatus.MEETING_SCHEDULED]: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    [LeadStatus.WON]: 'bg-emerald-500 text-white border-transparent',
    [LeadStatus.LOST]: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${styles[status] || 'bg-gray-50'}`}>
      {status}
    </span>
  );
};

const CRM: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS as Lead[]);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const handleEdit = (lead: Lead) => {
    setEditingLead({ ...lead });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      setLeads(leads.map(l => l.id === editingLead.id ? editingLead : l));
      setEditingLead(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic">CRM - Gestão de Oportunidades</h1>
          <p className="text-gray-500 mt-1 font-medium">Controle total sobre o pipeline de vendas qualificado pela IA.</p>
        </div>
        <button className="bg-emerald-600 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 text-xs uppercase tracking-widest">
          <Plus size={18} />
          Novo Lead
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, email ou telefone..." 
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="px-6 py-3 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 text-gray-600 flex items-center gap-2 transition-all text-xs font-black uppercase tracking-widest">
          <Filter size={18} />
          Filtros Avançados
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-5 text-left text-[10px] uppercase font-black text-gray-400 tracking-widest">Proprietário / Lead</th>
              <th className="px-8 py-5 text-left text-[10px] uppercase font-black text-gray-400 tracking-widest">Status</th>
              <th className="px-8 py-5 text-left text-[10px] uppercase font-black text-gray-400 tracking-widest">Data de Entrada</th>
              <th className="px-8 py-5 text-right text-[10px] uppercase font-black text-gray-400 tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-gray-800 text-sm tracking-tight">{lead.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{lead.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-8 py-6">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{lead.createdAt}</span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(lead)}
                      className="p-3 bg-white text-gray-400 hover:text-emerald-600 border border-gray-100 rounded-xl hover:shadow-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button className="p-3 bg-white text-gray-400 hover:text-emerald-600 border border-gray-100 rounded-xl hover:shadow-lg transition-all">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-emerald-950/20 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden border border-emerald-800/10">
            <div className="p-8 md:p-12 space-y-8">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Modo de Edição</span>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Editar Lead</h2>
                </div>
                <button onClick={() => setEditingLead(null)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome Completo</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                    value={editingLead.name}
                    onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">E-mail</label>
                    <input 
                      type="email" 
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                      value={editingLead.email}
                      onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Telefone</label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                      value={editingLead.phone}
                      onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Status do Funil</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest"
                    value={editingLead.status}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as LeadStatus })}
                  >
                    {Object.values(LeadStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Notas do Atendimento</label>
                  <textarea 
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm h-32 resize-none"
                    value={editingLead.notes}
                    onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingLead(null)}
                    className="flex-1 px-8 py-5 border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-8 py-5 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
