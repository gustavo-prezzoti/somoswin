import { matchPath } from 'react-router-dom';

export interface AdminRouteMeta {
    title: string;
    subtitle: string;
}

const ROUTES: { pattern: string; end?: boolean; meta: AdminRouteMeta }[] = [
    { pattern: '/admin/crm', meta: { title: 'CRM e Leads', subtitle: 'Pipeline e qualificação' } },
    { pattern: '/admin/atendimento', meta: { title: 'Atendimento', subtitle: 'Conversas WhatsApp' } },
    { pattern: '/admin/escuta', meta: { title: 'Escuta Inteligente', subtitle: 'Análise de áudio e transcrições' } },
    { pattern: '/admin/clientes', meta: { title: 'Clientes', subtitle: 'Empresas e relacionamento' } },
    { pattern: '/admin/meta-ads', meta: { title: 'Meta Ads', subtitle: 'Campanhas e conexão por empresa' } },
    { pattern: '/admin/metas', meta: { title: 'Metas e Objetivos', subtitle: 'Ciclo anual por empresa' } },
    { pattern: '/admin/agenda', meta: { title: 'Agenda Comercial', subtitle: 'Reuniões e compromissos por empresa' } },
    {
        pattern: '/admin/diagnostico',
        meta: { title: 'Diagnóstico Comercial', subtitle: 'Leitura unificada de pipeline, metas e riscos' },
    },
    { pattern: '/admin/consultancy/aparencia', meta: { title: 'Consultoria', subtitle: 'Aparência global' } },
    { pattern: '/admin/consultancy', meta: { title: 'Consultoria', subtitle: 'Operações e aparência' } },
    { pattern: '/admin/users', meta: { title: 'Usuários', subtitle: 'Gestão de contas e permissões' } },
    { pattern: '/admin/companies', meta: { title: 'Contratos', subtitle: 'Empresas e contratos' } },
    { pattern: '/admin/instances', meta: { title: 'Instâncias', subtitle: 'WhatsApp e instâncias' } },
    { pattern: '/admin/user-connections', meta: { title: 'Conexões', subtitle: 'Conexões de usuários' } },
    { pattern: '/admin/agents', meta: { title: 'Agentes IA', subtitle: 'Agentes e automação' } },
    { pattern: '/admin/followup', meta: { title: 'Follow-up', subtitle: 'Configuração de follow-up' } },
    { pattern: '/admin/settings', meta: { title: 'Configurações', subtitle: 'Configurações globais' } },
    { pattern: '/admin/notifications', meta: { title: 'Notificações', subtitle: 'Notificações globais' } },
    { pattern: '/admin/terms', meta: { title: 'Termos de Uso', subtitle: 'Termos e aceites' } },
    { pattern: '/admin/em-breve', meta: { title: 'Em desenvolvimento', subtitle: 'Módulo em construção' } },
    { pattern: '/admin', end: true, meta: { title: 'Dashboard', subtitle: 'Visão geral estratégica e operacional' } },
];

const DEFAULT_META: AdminRouteMeta = {
    title: 'Admin',
    subtitle: 'Painel administrativo',
};

export function getAdminRouteMeta(pathname: string): AdminRouteMeta {
    for (const r of ROUTES) {
        const m = matchPath({ path: r.pattern, end: r.end ?? false }, pathname);
        if (m) return r.meta;
    }
    return DEFAULT_META;
}
