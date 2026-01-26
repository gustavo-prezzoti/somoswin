import React, { useState, useEffect } from 'react';
import {
    Users,
    Video,
    Plus,
    Edit2,
    Trash2,
    Search,
    ChevronLeft,
    ChevronRight,
    ToggleLeft,
    ToggleRight,
    Star,
    Phone,
    Loader2,
    X,
    Save,
    Image as ImageIcon
} from 'lucide-react';
import { professionalService, Professional, ProfessionalRequest } from '../../services/api/professional.service';

type TabType = 'DESIGNER' | 'EDITOR';

const AdminProfessionals: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('DESIGNER');
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
    const [professionalToDelete, setProfessionalToDelete] = useState<Professional | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<ProfessionalRequest>({
        name: '',
        specialty: '',
        rating: 5.0,
        price: 0,
        imageUrl: '',
        whatsapp: '',
        type: 'DESIGNER',
        active: true
    });

    useEffect(() => {
        loadProfessionals();
    }, [activeTab, page]);

    const loadProfessionals = async () => {
        try {
            setLoading(true);
            const response = await professionalService.getByTypeAdmin(activeTab, page, 10);
            setProfessionals(response.content);
            setTotalPages(response.totalPages);
            setTotalElements(response.totalElements);
        } catch (error) {
            console.error('Failed to load professionals', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setPage(0);
    };

    const openCreateModal = () => {
        setEditingProfessional(null);
        setFormData({
            name: '',
            specialty: '',
            rating: 5.0,
            price: 0,
            imageUrl: '',
            whatsapp: '',
            type: activeTab,
            active: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (professional: Professional) => {
        setEditingProfessional(professional);
        setFormData({
            name: professional.name,
            specialty: professional.specialty,
            rating: professional.rating,
            price: professional.price,
            imageUrl: professional.imageUrl || '',
            whatsapp: professional.whatsapp,
            type: professional.type,
            active: professional.active
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            if (editingProfessional) {
                await professionalService.update(editingProfessional.id, formData);
            } else {
                await professionalService.create(formData);
            }
            setIsModalOpen(false);
            loadProfessionals();
        } catch (error) {
            console.error('Failed to save professional', error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (professional: Professional) => {
        try {
            await professionalService.toggleActive(professional.id);
            loadProfessionals();
        } catch (error) {
            console.error('Failed to toggle active', error);
        }
    };

    const handleDelete = async () => {
        if (!professionalToDelete) return;
        try {
            await professionalService.delete(professionalToDelete.id);
            setIsDeleteModalOpen(false);
            setProfessionalToDelete(null);
            loadProfessionals();
        } catch (error) {
            console.error('Failed to delete professional', error);
        }
    };

    const formatWhatsApp = (value: string) => {
        // Remove tudo que não é número ou +
        let cleaned = value.replace(/[^\d+]/g, '');

        // Garante que começa com +
        if (cleaned && !cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }

        return cleaned;
    };

    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const filteredProfessionals = professionals.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tighter uppercase">Profissionais</h1>
                    <p className="text-gray-500 mt-1">Gerencie designers e editores de vídeo</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg"
                >
                    <Plus size={20} />
                    Novo Profissional
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => handleTabChange('DESIGNER')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'DESIGNER'
                            ? 'bg-white text-emerald-600 shadow-lg'
                            : 'text-gray-500 hover:text-emerald-600'
                        }`}
                >
                    <Users size={18} />
                    Designers
                </button>
                <button
                    onClick={() => handleTabChange('EDITOR')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'EDITOR'
                            ? 'bg-white text-emerald-600 shadow-lg'
                            : 'text-gray-500 hover:text-emerald-600'
                        }`}
                >
                    <Video size={18} />
                    Editores de Vídeo
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nome ou especialidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                ) : filteredProfessionals.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <Users size={48} className="mx-auto mb-4 opacity-30" />
                        <p>Nenhum profissional encontrado</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Profissional</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Especialidade</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Preço</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">WhatsApp</th>
                                <th className="text-center py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProfessionals.map((professional) => (
                                <tr key={professional.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                                {professional.imageUrl ? (
                                                    <img src={professional.imageUrl} alt={professional.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <ImageIcon size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-bold text-gray-800">{professional.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-gray-600">{professional.specialty}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-1 text-amber-500">
                                            <Star size={14} fill="currentColor" />
                                            <span className="font-bold">{professional.rating}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 font-bold text-emerald-600">{formatPrice(professional.price)}</td>
                                    <td className="py-4 px-6">
                                        <a
                                            href={professional.whatsappLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                                        >
                                            <Phone size={14} />
                                            <span className="text-sm">{professional.whatsapp}</span>
                                        </a>
                                    </td>
                                    <td className="py-4 px-6">
                                        <button
                                            onClick={() => handleToggleActive(professional)}
                                            className="flex items-center justify-center w-full"
                                        >
                                            {professional.active ? (
                                                <ToggleRight size={28} className="text-emerald-500" />
                                            ) : (
                                                <ToggleLeft size={28} className="text-gray-400" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(professional)}
                                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setProfessionalToDelete(professional);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            Mostrando {professionals.length} de {totalElements} profissionais
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="px-4 py-2 text-sm font-bold">
                                {page + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">
                                {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Type */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tipo</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'DESIGNER' })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold transition-all ${formData.type === 'DESIGNER'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <Users size={18} />
                                        Designer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'EDITOR' })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold transition-all ${formData.type === 'EDITOR'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <Video size={18} />
                                        Editor
                                    </button>
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nome</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    placeholder="Nome completo"
                                />
                            </div>

                            {/* Specialty */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Especialidade</label>
                                <input
                                    type="text"
                                    value={formData.specialty}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    placeholder="Ex: Brand Identity & UI"
                                />
                            </div>

                            {/* Rating and Price */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Rating (0-5)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="5"
                                        value={formData.rating}
                                        onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Preço (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>

                            {/* WhatsApp */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={formData.whatsapp}
                                        onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        placeholder="+5511999999999"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Formato: +DDI DDD Número (ex: +5511999999999)</p>
                            </div>

                            {/* Image URL */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">URL da Imagem</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        placeholder="https://..."
                                    />
                                    {formData.imageUrl && (
                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Active */}
                            <div className="flex items-center justify-between py-3">
                                <span className="font-bold text-gray-700">Ativo</span>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                                >
                                    {formData.active ? (
                                        <ToggleRight size={32} className="text-emerald-500" />
                                    ) : (
                                        <ToggleLeft size={32} className="text-gray-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !formData.name || !formData.specialty || !formData.whatsapp}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                {editingProfessional ? 'Salvar' : 'Criar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && professionalToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                                <Trash2 size={24} className="text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Excluir profissional?</h3>
                        </div>

                        <p className="text-gray-600 mb-8">
                            Tem certeza que deseja excluir <strong>{professionalToDelete.name}</strong>? Esta ação não pode ser desfeita.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setProfessionalToDelete(null);
                                }}
                                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProfessionals;
