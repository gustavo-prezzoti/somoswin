
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useLeads } from '../hooks/useLeads';
import { Lead, LeadStatus, User } from '../types/database.types';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Plus, Upload, MoreVertical, ChevronLeft, ChevronRight, Edit, Trash2, AlertTriangle, Calendar, Clock, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';


const statusConfig: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: 'Novo', color: 'bg-sky-100 text-sky-800' },
  contacted: { label: 'Contactado', color: 'bg-amber-100 text-amber-800' },
  qualified: { label: 'Qualificado', color: 'bg-purple-100 text-purple-800' },
  meeting_scheduled: { label: 'Reunião Agendada', color: 'bg-emerald-100 text-emerald-800' },
  won: { label: 'Ganho', color: 'bg-green-100 text-green-800' },
  lost: { label: 'Perdido', color: 'bg-red-100 text-red-800' },
};

const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  const { label, color } = statusConfig[status] || { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${color}`}>
      {label}
    </span>
  );
};


const AddLeadModal: React.FC<{ isOpen: boolean; onClose: () => void; users: User[] }> = ({ isOpen, onClose, users }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Novo Lead">
      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                <Input placeholder="Ex: João da Silva" className="mt-1"/>
            </div>
             <div>
                <label className="text-sm font-medium text-gray-700">E-mail</label>
                <Input type="email" placeholder="joao.silva@exemplo.com" className="mt-1"/>
            </div>
        </div>
        <div>
            <label className="text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
            <Input type="tel" placeholder="(11) 99999-9999" className="mt-1"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select className="w-full mt-1">
                    {Object.entries(statusConfig).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                </Select>
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
            <Button type="submit" onClick={(e) => { e.preventDefault(); onClose(); }}>Salvar Lead</Button>
        </div>
      </form>
    </Modal>
  )
}

const EditLeadModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (lead: Lead) => void; users: User[]; lead: Lead | null }> = ({ isOpen, onClose, onSave, users, lead }) => {
  const [formData, setFormData] = useState<Lead | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success'>('idle');

  useEffect(() => {
    if (lead) {
      setFormData({
        ...lead,
        meeting_date: lead.meeting_date ? format(new Date(lead.meeting_date), 'yyyy-MM-dd') : '',
      });
    }
  }, [lead]);

  useEffect(() => {
    if (isOpen) {
        setSaveState('idle');
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData) {
      setSaveState('saving');
      const updatedFormData = { ...formData, updated_at: new Date().toISOString() };
      setFormData(updatedFormData);

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onSave(updatedFormData);
      setSaveState('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar Lead: ${lead?.name}`}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-3 -mr-3">
          <fieldset>
            <legend className="text-base font-semibold text-emerald-800 mb-2">Informações de Contato</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-mail</label>
                <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
                <Input id="phone" name="phone" type="tel" value={formData.phone || ''} onChange={handleChange} />
              </div>
            </div>
          </fieldset>
          
          <fieldset>
            <legend className="text-base font-semibold text-emerald-800 mb-2">Detalhes do Lead</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <Select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full">
                  {Object.entries(statusConfig).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                </Select>
              </div>
              <div>
                <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700">Responsável</label>
                <Select id="assigned_to" name="assigned_to" value={formData.assigned_to || ''} onChange={handleChange} className="w-full">
                  <option value="">Ninguém</option>
                  {users.map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </Select>
              </div>
            </div>
             <div className="mt-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Anotações</label>
              <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={4} placeholder="Adicione detalhes, histórico de interações, etc."/>
            </div>
          </fieldset>

          {formData.status === 'meeting_scheduled' && (
            <fieldset className="bg-emerald-50 p-4 rounded-lg">
              <legend className="text-base font-semibold text-emerald-800 mb-2">Agendamento de Reunião</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                   <div className="relative">
                      <label htmlFor="meeting_date" className="block text-sm font-medium text-gray-700">Data da Reunião</label>
                      <Calendar className="absolute left-2.5 top-9 h-4 w-4 text-gray-400"/>
                      <Input id="meeting_date" name="meeting_date" type="date" value={formData.meeting_date || ''} onChange={handleChange} className="pl-8"/>
                  </div>
                  <div className="relative">
                      <label htmlFor="meeting_time" className="block text-sm font-medium text-gray-700">Horário</label>
                      <Clock className="absolute left-2.5 top-9 h-4 w-4 text-gray-400"/>
                      <Input id="meeting_time" name="meeting_time" type="time" value={formData.meeting_time || ''} onChange={handleChange} className="pl-8"/>
                  </div>
              </div>
            </fieldset>
          )}

        </div>
        <div className="mt-8 flex justify-between items-center pt-4 border-t border-gray-200 -mx-6 -mb-6 px-6 py-4 bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-500">
            Última atualização: {formatDistanceToNow(new Date(formData.updated_at), { locale: ptBR, addSuffix: true })}
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" type="button" onClick={onClose} disabled={saveState === 'saving'}>Cancelar</Button>
            <Button
                type="submit"
                disabled={saveState !== 'idle'}
                className={saveState === 'success' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : ''}
            >
                {saveState === 'saving' && 'Salvando...'}
                {saveState === 'success' && <><Check className="w-4 h-4" /> Salvo!</>}
                {saveState === 'idle' && 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

const DeleteLeadModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; lead: Lead | null }> = ({ isOpen, onClose, onConfirm, lead }) => {
    if (!isOpen || !lead) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Exclusão">
            <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Excluir Lead</h3>
                <div className="mt-2 px-7 py-3">
                    <p className="text-sm text-gray-500">
                        Você tem certeza que deseja excluir o lead <span className="font-bold">{lead.name}</span>? Esta ação não pode ser desfeita.
                    </p>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                        onClick={onConfirm}
                    >
                        Excluir
                    </Button>
                </div>
            </div>
        </Modal>
    );
};


const CRM: React.FC = () => {
  const { data, isLoading, isError } = useLeads();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('last_30_days');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const leadsPerPage = 10;

  useEffect(() => {
    const leadIdFromState = location.state?.leadId;
    if (leadIdFromState && data?.leads) {
      const lead = data.leads.find(l => l.id === leadIdFromState);
      if (lead) {
        setSearchTerm(lead.name);
        // Clear state after using it to avoid re-filtering on navigation
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.state, data, navigate]);

  const handleEditClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditModalOpen(true);
  };

  const handleSaveLead = (updatedLead: Lead) => {
    queryClient.setQueryData(['leads'], (oldData: { leads: Lead[], users: User[] } | undefined) => {
      if (!oldData) return oldData;
      const newLeads = oldData.leads.map(lead =>
        lead.id === updatedLead.id ? updatedLead : lead
      );
      return { ...oldData, leads: newLeads };
    });

    setIsEditModalOpen(false);
    setSelectedLead(null);
  }

  const handleDeleteClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    // In a real app, you would call a mutation here
    alert(`Lead "${selectedLead?.name}" excluído com sucesso! (Demo)`);
    setIsDeleteModalOpen(false);
    setSelectedLead(null);
  }

  const filteredLeads = useMemo(() => {
    if (!data?.leads) return [];
    return data.leads
      .filter(lead => 
        (lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         lead.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .filter(lead => statusFilter === 'all' || lead.status === statusFilter);
  }, [data?.leads, searchTerm, statusFilter]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * leadsPerPage;
    return filteredLeads.slice(startIndex, startIndex + leadsPerPage);
  }, [filteredLeads, currentPage]);

  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);


  if (isLoading) return <div className="p-6">Carregando leads...</div>;
  if (isError) return <div className="p-6 text-red-600">Erro ao carregar os dados do CRM.</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gray-50 min-h-full">
      <AddLeadModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} users={data?.users || []} />
      <EditLeadModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveLead} users={data?.users || []} lead={selectedLead} />
      <DeleteLeadModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} lead={selectedLead} />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-900">CRM - Gestão de Leads</h1>
          <p className="text-gray-600">Visualize, gerencie e converta seus leads em clientes.</p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button variant="secondary" size="md" className="hidden sm:inline-flex">
            <Upload className="h-4 w-4" />
            <span>Importar</span>
          </Button>
          <Button variant="primary" size="md" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>Adicionar Lead</span>
          </Button>
        </div>
      </div>
      
      <Card>
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                <Input 
                    placeholder="Buscar por nome ou e-mail..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-4">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-auto">
                    <option value="all">Todos os Status</option>
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </Select>
                <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase font-semibold">
                    <tr>
                        <th className="p-4 w-10"><input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" /></th>
                        <th className="p-4">Nome</th>
                        <th className="p-4 hidden md:table-cell">Contato</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 hidden lg:table-cell">Responsável</th>
                        <th className="p-4 hidden md:table-cell">Criado em</th>
                        <th className="p-4">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {paginatedLeads.map(lead => {
                        const assignedUser = data?.users.find(u => u.id === lead.assigned_to);
                        return (
                            <tr key={lead.id} className="hover:bg-gray-50">
                                <td className="p-4"><input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" /></td>
                                <td className="p-4">
                                    <p className="font-bold text-emerald-900">{lead.name}</p>
                                    <p className="text-xs text-gray-500 md:hidden">{lead.email}</p>
                                </td>
                                <td className="p-4 text-gray-700 hidden md:table-cell">{lead.phone}</td>
                                <td className="p-4"><StatusBadge status={lead.status} /></td>
                                <td className="p-4 hidden lg:table-cell">
                                    {assignedUser && (
                                        <div className="flex items-center gap-2">
                                            <img src={assignedUser.avatar_url} alt={assignedUser.full_name} className="w-7 h-7 rounded-full"/>
                                            <span className="text-gray-700">{assignedUser.full_name}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-gray-500 hidden md:table-cell">{format(new Date(lead.created_at), 'dd/MM/yyyy')}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(lead)}><Edit className="w-4 h-4"/></Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteClick(lead)}><Trash2 className="w-4 h-4"/></Button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
                Mostrando <span className="font-bold">{(currentPage - 1) * leadsPerPage + 1}</span> a <span className="font-bold">{Math.min(currentPage * leadsPerPage, filteredLeads.length)}</span> de <span className="font-bold">{filteredLeads.length}</span> leads
            </p>
            <div className="flex items-center gap-2">
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </Button>
                <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default CRM;
