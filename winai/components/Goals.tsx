
import React, { useState, useEffect } from 'react';
import {
    Target,
    Plus,
    Trash2,
    Edit2,
    Star,
    CheckCircle2,
    TrendingUp,
    Users,
    Calendar,
    AlertCircle,
    Loader2,
    X,
    Save,
    ChevronRight
} from 'lucide-react';
import { dashboardService } from '../services/api/dashboard.service';

interface Goal {
    id: number;
    title: string;
    description: string;
    type: string;
    targetValue: number;
    currentValue: number;
    progressPercentage: number;
    status: string;
    isHighlighted: boolean;
}

const Goals: React.FC = () => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentGoal, setCurrentGoal] = useState<Partial<Goal>>({
        title: '',
        description: '',
        type: 'LEADS',
        targetValue: 0,
        isHighlighted: false
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadGoals();
    }, []);

    const loadGoals = async () => {
        setIsLoading(true);
        try {
            const data = await dashboardService.getAllGoals();
            setGoals(data);
        } catch (error) {
            console.error('Failed to load goals', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (isEditing && currentGoal.id) {
                await dashboardService.updateGoal(currentGoal.id, currentGoal);
            } else {
                await dashboardService.createGoal(currentGoal);
            }
            setIsModalOpen(false);
            loadGoals();
            resetForm();
        } catch (error: any) {
            alert(error.message || 'Erro ao salvar meta');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja deletar esta meta?')) return;
        try {
            await dashboardService.deleteGoal(id);
            loadGoals();
        } catch (error) {
            console.error('Failed to delete goal', error);
        }
    };

    const handleToggleHighlight = async (id: number) => {
        try {
            await dashboardService.toggleGoalHighlight(id);
            loadGoals();
        } catch (error: any) {
            alert(error.message || 'Erro ao destacar meta');
        }
    };

    const resetForm = () => {
        setCurrentGoal({
            title: '',
            description: '',
            type: 'LEADS',
            targetValue: 0,
            isHighlighted: false
        });
        setIsEditing(false);
    };

    const openEditModal = (goal: Goal) => {
        setCurrentGoal(goal);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'LEADS': return <Users size={18} />;
            case 'CPL': return <TrendingUp size={18} />;
            case 'SHOWUP': return <Calendar size={18} />;
            default: return <Target size={18} />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">
                        Gestão de <span className="text-emerald-600">Metas.</span>
                    </h1>
                    <p className="text-gray-500 font-medium">Defina e acompanhe os objetivos estratégicos da sua operação.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-emerald-600 text-white font-black px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 group"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    NOVA META
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 size={40} className="text-emerald-500 animate-spin" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sincronizando Objetivos...</p>
                </div>
            ) : goals.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                        <Target size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-800 uppercase italic">Nenhuma meta configurada</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">Comece definindo seus primeiros objetivos para acompanhar o crescimento da sua empresa.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-emerald-600 font-bold hover:underline"
                    >
                        Clique aqui para criar sua primeira meta
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map((goal) => (
                        <div
                            key={goal.id}
                            className={`group bg-white rounded-[32px] p-8 border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden ${goal.isHighlighted ? 'border-emerald-500 shadow-xl shadow-emerald-500/5' : 'border-gray-100'
                                }`}
                        >
                            {goal.isHighlighted && (
                                <div className="absolute top-0 right-0">
                                    <div className="bg-emerald-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest shadow-lg">
                                        Destaque
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${goal.isHighlighted ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {getIconForType(goal.type)}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleToggleHighlight(goal.id)}
                                            className={`p-2 rounded-lg transition-colors ${goal.isHighlighted ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:bg-gray-50'}`}
                                            title={goal.isHighlighted ? "Remover do Dashboard" : "Destacar no Dashboard"}
                                        >
                                            <Star size={18} fill={goal.isHighlighted ? "currentColor" : "none"} />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(goal)}
                                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(goal.id)}
                                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight uppercase italic truncate">{goal.title}</h3>
                                    <p className="text-sm text-gray-500 font-medium line-clamp-2">{goal.description}</p>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Progresso</span>
                                            <span className="text-3xl font-black text-gray-900 italic">{goal.progressPercentage}%</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Alvo</span>
                                            <span className="text-sm font-bold text-gray-600">{goal.currentValue} / {goal.targetValue}</span>
                                        </div>
                                    </div>

                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)] ${goal.progressPercentage >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                                }`}
                                            style={{ width: `${goal.progressPercentage}%` }}
                                        />
                                    </div>
                                </div>

                                {goal.progressPercentage >= 100 && (
                                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl">
                                        <CheckCircle2 size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Objetivo Concluído</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Meta */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#001f16]/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
                    <div className="bg-white rounded-[40px] w-full max-w-xl relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                                        <Target size={24} />
                                    </div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase">
                                        {isEditing ? 'Editar' : 'Nova'} <span className="text-emerald-600">Meta.</span>
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateOrUpdate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Título do Objetivo</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: 500 LEADS NO CICLO"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold text-gray-800 placeholder:text-gray-300"
                                        value={currentGoal.title}
                                        onChange={(e) => setCurrentGoal({ ...currentGoal, title: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Descrição Curta</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Explique o que esta meta representa..."
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-semibold text-gray-800 placeholder:text-gray-300 resize-none"
                                        value={currentGoal.description}
                                        onChange={(e) => setCurrentGoal({ ...currentGoal, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Tipo de Métrica</label>
                                        <select
                                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold text-gray-800 appearance-none pointer-events-auto"
                                            value={currentGoal.type}
                                            onChange={(e) => setCurrentGoal({ ...currentGoal, type: e.target.value })}
                                        >
                                            <option value="LEADS">Leads</option>
                                            <option value="CPL">CPL (Custo)</option>
                                            <option value="SHOWUP">Show-up (Agenda)</option>
                                            <option value="CONVERSION">Conversão</option>
                                            <option value="CUSTOM">Personalizada</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Valor Alvo</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold text-gray-800 placeholder:text-gray-300"
                                            value={currentGoal.targetValue}
                                            onChange={(e) => setCurrentGoal({ ...currentGoal, targetValue: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <input
                                        type="checkbox"
                                        id="highlighted"
                                        className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        checked={currentGoal.isHighlighted}
                                        onChange={(e) => setCurrentGoal({ ...currentGoal, isHighlighted: e.target.checked })}
                                    />
                                    <label htmlFor="highlighted" className="text-xs font-black text-gray-700 uppercase tracking-widest cursor-pointer select-none">
                                        Destacar no Dashboard Principal
                                    </label>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 bg-gray-100 text-gray-600 font-black py-5 rounded-2xl hover:bg-gray-200 transition-all uppercase tracking-widest text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-[2] bg-emerald-600 text-white font-black py-5 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                {isEditing ? 'SALVAR ALTERAÇÕES' : 'CRIAR META'}
                                            </>
                                        )}
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

export default Goals;
