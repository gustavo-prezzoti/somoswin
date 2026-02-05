import React, { useState, useEffect } from 'react';
import {
    Facebook,
    Instagram,
    CreditCard,
    TrendingUp,
    Eye,
    MousePointerClick,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    X,
    Megaphone,
    Building2
} from 'lucide-react';
import { marketingService, MetaConnectionDetails } from '../services/api/marketing.service';

interface MetaConnectionManagerProps {
    onClose: () => void;
}

const MetaConnectionManager: React.FC<MetaConnectionManagerProps> = ({ onClose }) => {
    const [details, setDetails] = useState<MetaConnectionDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDetails();
    }, []);

    const loadDetails = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await marketingService.getDetails();
            setDetails(data);
        } catch (err: any) {
            console.error('Failed to load Meta details', err);
            setError('Não foi possível carregar os detalhes da conexão.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const formatNumber = (num?: number) => {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toLocaleString('pt-BR');
    };

    // Loading State
    if (isLoading) {
        return (
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-2xl w-full max-w-2xl mx-4 p-8 flex flex-col items-center gap-4"
                    onClick={e => e.stopPropagation()}
                >
                    <RefreshCw size={32} className="text-blue-600 animate-spin" />
                    <p className="text-gray-600 text-sm">Carregando...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (error || !details || !details.connected) {
        return (
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-2xl w-full max-w-md mx-4 p-8 flex flex-col items-center gap-4"
                    onClick={e => e.stopPropagation()}
                >
                    <AlertTriangle size={40} className="text-amber-500" />
                    <p className="text-gray-800 font-semibold text-center">{error || 'Conta não conectada'}</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-3xl shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Facebook size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Conexão Meta</h2>
                            <p className="text-xs text-gray-500">Facebook & Instagram Ads</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

                    {/* Status */}
                    <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-800">Conectado</p>
                            <p className="text-xs text-emerald-600">Desde {formatDate(details.connectedAt)}</p>
                        </div>
                    </div>

                    {/* Accounts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Ad Account */}
                        {details.adAccount && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <CreditCard size={16} className="text-blue-600" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Conta de Anúncios</span>
                                </div>
                                <p className="font-semibold text-gray-900 text-sm mb-3 truncate" title={details.adAccount.name}>
                                    {details.adAccount.name}
                                </p>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Status</span>
                                        <span className={`font-medium ${details.adAccount.status === 'Ativo' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {details.adAccount.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Moeda</span>
                                        <span className="font-medium text-gray-700">{details.adAccount.currency}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Fuso</span>
                                        <span className="font-medium text-gray-700 text-[11px]">{details.adAccount.timezone?.replace('America/', '')}</span>
                                    </div>
                                </div>
                                {details.adAccount.businessName && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <Building2 size={12} />
                                            <span className="truncate" title={details.adAccount.businessName}>{details.adAccount.businessName}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Page */}
                        {details.page && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Facebook size={16} className="text-blue-600" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Página</span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    {details.page.pictureUrl ? (
                                        <img src={details.page.pictureUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Facebook size={16} className="text-blue-600" />
                                        </div>
                                    )}
                                    <p className="font-semibold text-gray-900 text-sm truncate flex-1" title={details.page.name}>
                                        {details.page.name}
                                    </p>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Categoria</span>
                                        <span className="font-medium text-gray-700">{details.page.category}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Curtidas</span>
                                        <span className="font-medium text-blue-600">{formatNumber(details.page.fanCount)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Instagram */}
                        {details.instagram && (
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Instagram size={16} className="text-purple-600" />
                                    <span className="text-xs font-semibold text-purple-500 uppercase">Instagram</span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    {details.instagram.profilePictureUrl ? (
                                        <img src={details.instagram.profilePictureUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <Instagram size={16} className="text-purple-600" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{details.instagram.name}</p>
                                        <p className="text-xs text-purple-500">@{details.instagram.username}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="text-center bg-white/60 rounded-lg py-2">
                                        <p className="text-lg font-bold text-purple-600">{formatNumber(details.instagram.followersCount)}</p>
                                        <p className="text-[10px] text-gray-500">Seguidores</p>
                                    </div>
                                    <div className="text-center bg-white/60 rounded-lg py-2">
                                        <p className="text-lg font-bold text-purple-600">{formatNumber(details.instagram.mediaCount)}</p>
                                        <p className="text-[10px] text-gray-500">Posts</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metrics Summary */}
                    {(details.campaigns || details.insights) && (
                        <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={16} className="text-emerald-600" />
                                <h3 className="text-sm font-semibold text-emerald-800">Dados (Meta Ads)</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {details.campaigns && (
                                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                                        <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] uppercase mb-1">
                                            <Megaphone size={12} />
                                            Campanhas
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">{details.campaigns.total}</p>
                                        <p className="text-[10px] text-emerald-600">{details.campaigns.active} ativas</p>
                                    </div>
                                )}
                                {details.insights && (
                                    <>
                                        <div className="bg-white rounded-lg p-3 border border-emerald-100">
                                            <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] uppercase mb-1">
                                                <CreditCard size={12} />
                                                Investimento
                                            </div>
                                            <p className="text-xl font-bold text-gray-900">{details.insights.totalSpend}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-emerald-100">
                                            <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] uppercase mb-1">
                                                <Eye size={12} />
                                                Impressões
                                            </div>
                                            <p className="text-xl font-bold text-gray-900">{formatNumber(details.insights.totalImpressions)}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-emerald-100">
                                            <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] uppercase mb-1">
                                                <MousePointerClick size={12} />
                                                Cliques
                                            </div>
                                            <p className="text-xl font-bold text-gray-900">{formatNumber(details.insights.totalClicks)}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}


                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                    <button
                        onClick={loadDetails}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium"
                    >
                        <RefreshCw size={14} />
                        Atualizar
                    </button>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-emerald-600 text-white font-semibold text-sm rounded-lg hover:bg-emerald-700"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MetaConnectionManager;
