
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit2, X, Save, Trash2, Loader2, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { leadService, LeadData, LeadRequest, LeadStatusType, LEAD_STATUS_STYLES, LEAD_STATUS_LABELS } from '../services';
import { Modal, ConfirmModal } from './ui';

const StatusBadge = ({ status }: { status: LeadStatusType }) => {
  const style = LEAD_STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-100';
  const label = LEAD_STATUS_LABELS[status] || status;

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${style}`}>
      {label}
    </span>
  );
};

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
      <Users size={40} className="text-gray-400" />
    </div>
    <h3 className="text-xl font-black text-gray-700 mb-2">Nenhum lead cadastrado</h3>
    <p className="text-gray-400 max-w-md mb-6">Comece adicionando seu primeiro lead para gerenciar seu pipeline de vendas.</p>
    <button
      onClick={onAdd}
      className="bg-emerald-600 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 text-xs uppercase tracking-widest"
    >
      <Plus size={18} /> Adicionar Lead
    </button>
  </div>
);

const CRM: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<LeadData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; leadId: string | null; leadName: string }>({
    isOpen: false,
    leadId: null,
    leadName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [newLead, setNewLead] = useState<LeadRequest>({
    name: '',
    email: '',
    phone: '',
    status: 'NEW',
    ownerName: '',
    notes: '',
  });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await leadService.getAllLeads();
      setLeads(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar leads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadLeads();
      return;
    }
    setIsLoading(true);
    try {
      const data = await leadService.searchLeads(searchTerm);
      setLeads(data.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (lead: LeadData) => {
    setEditingLead({ ...lead });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    setIsSaving(true);
    try {
      const request: LeadRequest = {
        name: editingLead.name,
        email: editingLead.email,
        phone: editingLead.phone || undefined,
        status: editingLead.status as LeadStatusType,
        ownerName: editingLead.ownerName || undefined,
        notes: editingLead.notes || undefined,
      };
      const updated = await leadService.updateLead(editingLead.id, request);
      setLeads(leads.map(l => l.id === updated.id ? updated : l));
      setEditingLead(null);
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const created = await leadService.createLead(newLead);
      setLeads([created, ...leads]);
      setIsCreating(false);
      setNewLead({ name: '', email: '', phone: '', status: 'NEW', ownerName: '', notes: '' });
    } catch (err: any) {
      alert('Erro ao criar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = (lead: LeadData) => {
    setDeleteConfirm({ isOpen: true, leadId: lead.id, leadName: lead.name });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.leadId) return;
    setIsDeleting(true);
    try {
      await leadService.deleteLead(deleteConfirm.leadId);
      setLeads(leads.filter(l => l.id !== deleteConfirm.leadId));
      setDeleteConfirm({ isOpen: false, leadId: null, leadName: '' });
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.phone && l.phone.includes(searchTerm))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-emerald-600" />
          <p className="text-gray-500 font-medium">Carregando leads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-sm text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Erro ao carregar</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={loadLeads}
            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw size={18} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic">CRM - Gestão de Oportunidades</h1>
          <p className="text-gray-500 mt-1 font-medium">Controle total sobre o pipeline de vendas qualificado pela IA.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-emerald-600 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 text-xs uppercase tracking-widest"
        >
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
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button className="px-6 py-3 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 text-gray-600 flex items-center gap-2 transition-all text-xs font-black uppercase tracking-widest">
          <Filter size={18} />
          Filtros Avançados
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <EmptyState onAdd={() => setIsCreating(true)} />
        </div>
      ) : (
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
              {filteredLeads.map((lead) => (
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
                    <StatusBadge status={lead.status as LeadStatusType} />
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{formatDate(lead.createdAt)}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(lead)}
                        className="p-3 bg-white text-gray-400 hover:text-emerald-600 border border-gray-100 rounded-xl hover:shadow-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(lead)}
                        className="p-3 bg-white text-gray-400 hover:text-red-600 border border-gray-100 rounded-xl hover:shadow-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, leadId: null, leadName: '' })}
        onConfirm={handleDelete}
        title="Excluir Lead"
        message={`Tem certeza que deseja excluir o lead "${deleteConfirm.leadName}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingLead}
        onClose={() => setEditingLead(null)}
        title="Editar Lead"
        subtitle="Modo de Edição"
      >
        {editingLead && (
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
                  value={editingLead.phone || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Status do Funil</label>
              <select
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest"
                value={editingLead.status}
                onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as LeadStatusType })}
              >
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Notas do Atendimento</label>
              <textarea
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm h-32 resize-none"
                value={editingLead.notes || ''}
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
                disabled={isSaving}
                className="flex-1 px-8 py-5 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar Alterações
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Adicionar Lead"
        subtitle="Novo Cadastro"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome Completo *</label>
            <input
              type="text"
              required
              className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
              value={newLead.name}
              onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">E-mail *</label>
              <input
                type="email"
                required
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Telefone</label>
              <input
                type="text"
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Status do Funil</label>
            <select
              className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest"
              value={newLead.status}
              onChange={(e) => setNewLead({ ...newLead, status: e.target.value as LeadStatusType })}
            >
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Notas</label>
            <textarea
              className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm h-32 resize-none"
              value={newLead.notes}
              onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
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
              Criar Lead
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CRM;
