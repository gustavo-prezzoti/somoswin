import React from 'react';
import { Search, Filter, Eye, Building2, StickyNote, Trash2 } from 'lucide-react';
import type { AdminClientSummary } from '../../services/adminService';

export type AdminClientesTableRole = 'VENDEDOR' | 'OTHER';

interface AdminClientesTableProps {
    clients: AdminClientSummary[];
    /** Quando VENDEDOR, restringe às linhas em que sellerId = currentUserId */
    tableRole: AdminClientesTableRole;
    currentUserId: string | null;
    onOpenClient: (companyId: string, tab?: string) => void;
    /** Exige permissão contratos:delete ou clientes:delete */
    canDeleteClient: boolean;
    onRequestDeleteClient: (companyId: string, companyName: string) => void;
}

function getCheckpointColorClass(status: string): string {
    if (status === 'Em dia') return 'text-emerald-500';
    if (status === 'Atrasado') return 'text-orange-500';
    if (status === 'Muito atrasado') return 'text-red-500';
    return 'text-gray-400';
}

function formatContractDate(iso: string | null | undefined): string {
    if (!iso) return '-';
    const d = iso.length >= 10 ? iso.slice(0, 10) : iso;
    const p = d.split('-');
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return d;
}

/** Paridade painel-admin: só dia/mês (DD/MM). */
function formatLastAccess(iso: string | null | undefined): string {
    if (!iso) return '-';
    const datePart = iso.includes('T') ? iso.slice(0, 10) : iso.slice(0, 10);
    const p = datePart.split('-');
    if (p.length === 3) return `${p[2]}/${p[1]}`;
    return '-';
}

const AdminClientesTable: React.FC<AdminClientesTableProps> = ({
    clients,
    tableRole,
    currentUserId,
    onOpenClient,
    canDeleteClient,
    onRequestDeleteClient,
}) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterOpen, setFilterOpen] = React.useState(false);

    const filteredClients = clients.filter((client) => {
        const matchesSearch =
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.niche.toLowerCase().includes(searchTerm.toLowerCase());

        if (tableRole === 'VENDEDOR' && currentUserId) {
            return matchesSearch && client.sellerId === currentUserId;
        }

        return matchesSearch;
    });

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-8 border-b border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">Clientes</h2>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500">
                        {filteredClients.length} ativos
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="PESQUISAR CLIENTE..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-6 py-2.5 bg-gray-50 border border-black/5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00FF00]/20 w-64"
                        />
                    </div>
                    <button
                        onClick={() => setFilterOpen(!filterOpen)}
                        className={`p-2.5 border rounded-xl transition-all ${
                            filterOpen
                                ? 'bg-black text-white border-black'
                                : 'bg-gray-50 border-black/5 text-gray-400 hover:text-black'
                        }`}
                    >
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Cliente
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Início Contrato
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Término Contrato
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Último Acesso
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Checkpoint
                            </th>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                        {filteredClients.map((client) => (
                            <tr
                                key={client.companyId}
                                className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                            >
                                <td className="px-8 py-6" onClick={() => onOpenClient(client.companyId)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                                            <Building2 size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black italic tracking-tight">{client.name}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                                {client.niche}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6" onClick={() => onOpenClient(client.companyId)}>
                                    <span className="text-xs font-bold text-gray-600">
                                        {formatContractDate(client.subscriptionStartDate)}
                                    </span>
                                </td>
                                <td className="px-6 py-6" onClick={() => onOpenClient(client.companyId)}>
                                    <span className="text-xs font-bold text-gray-600">
                                        {formatContractDate(client.subscriptionEndDate)}
                                    </span>
                                </td>
                                <td className="px-6 py-6" onClick={() => onOpenClient(client.companyId)}>
                                    <span className="text-xs font-medium text-gray-500">
                                        {formatLastAccess(client.lastAccess)}
                                    </span>
                                </td>
                                <td className="px-6 py-6" onClick={() => onOpenClient(client.companyId)}>
                                    <div className="flex items-center gap-1.5">
                                        <div
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                client.checkpointStatus === 'Em dia'
                                                    ? 'bg-emerald-500'
                                                    : client.checkpointStatus === 'Atrasado'
                                                      ? 'bg-orange-500'
                                                      : 'bg-red-500'
                                            }`}
                                        />
                                        <span
                                            className={`text-[10px] font-bold uppercase tracking-wide ${getCheckpointColorClass(
                                                client.checkpointStatus
                                            )}`}
                                        >
                                            {client.checkpointStatus}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenClient(client.companyId, 'notes');
                                            }}
                                            className="p-2 bg-white border border-black/5 rounded-lg text-gray-400 hover:text-blue-500 hover:border-blue-500/30 transition-all shadow-sm"
                                            title="Ver Notas"
                                        >
                                            <StickyNote size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenClient(client.companyId);
                                            }}
                                            className="p-2 bg-white border border-black/5 rounded-lg text-gray-400 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm"
                                            title="Ver Detalhes"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        {canDeleteClient && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRequestDeleteClient(client.companyId, client.name);
                                                }}
                                                className="p-2 bg-white border border-black/5 rounded-lg text-gray-400 hover:text-rose-600 hover:border-rose-500/30 transition-all shadow-sm"
                                                title="Remover cliente"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminClientesTable;
