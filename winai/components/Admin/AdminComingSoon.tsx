import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { motion } from 'framer-motion';

/** Módulos que já têm rota dedicada — redireciona URLs antigas (?m=). */
const LEGACY_REDIRECT: Record<string, string> = {
    financas: '/admin/financas',
    faturamento: '/admin/financas',
};

const MODULE_LABELS: Record<string, string> = {
    prompts: 'Prompts IA',
};

const AdminComingSoon: React.FC = () => {
    const [params] = useSearchParams();
    const m = params.get('m') || '';
    const legacyTo = LEGACY_REDIRECT[m];
    if (legacyTo) {
        return <Navigate to={legacyTo} replace />;
    }
    const label = MODULE_LABELS[m] || 'Este módulo';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
        >
            <div className="glass-card rounded-2xl border border-black/5 bg-gray-50 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <Construction className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414] mb-2">{label}</h2>
                <p className="text-sm text-gray-400 font-medium">Em desenvolvimento — integração com banco e API virá nas próximas entregas.</p>
            </div>
        </motion.div>
    );
};

export default AdminComingSoon;
