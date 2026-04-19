import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { motion } from 'framer-motion';

const MODULE_LABELS: Record<string, string> = {
    crm: 'CRM e Leads',
    atendimento: 'Atendimento',
    escuta: 'Escuta Inteligente',
    clientes: 'Clientes',
    metaads: 'Meta Ads',
    metas: 'Metas e Objetivos',
    agenda: 'Agenda Comercial',
    diagnostico: 'Diagnóstico Comercial',
    alertas: 'Alertas',
    performance: 'Performance',
    gestao_equipe: 'Gestão de Equipe',
    equipe: 'Equipe Admin',
    financas: 'Finanças',
    prompts: 'Prompts IA',
};

const AdminComingSoon: React.FC = () => {
    const [params] = useSearchParams();
    const m = params.get('m') || '';
    const label = MODULE_LABELS[m] || 'Este módulo';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
        >
            <div className="glass-card rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#00FF00]/10 flex items-center justify-center">
                    <Construction className="w-8 h-8 text-[#00FF00]" />
                </div>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-2">{label}</h2>
                <p className="text-sm text-gray-400 font-medium">Em desenvolvimento — integração com banco e API virá nas próximas entregas.</p>
            </div>
        </motion.div>
    );
};

export default AdminComingSoon;
