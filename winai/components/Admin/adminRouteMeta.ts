import { matchPath } from 'react-router-dom';

export interface AdminRouteMeta {
    title: string;
    subtitle: string;
}

/** Títulos/subtítulos alinhados a amplia-painel/src/App.tsx (getTabTitle / getTabSubtitle). */
const ROUTES: { pattern: string; end?: boolean; meta: AdminRouteMeta }[] = [
    { pattern: '/admin/agenda', meta: { title: 'Agenda', subtitle: 'Encontros comerciais da semana' } },
    { pattern: '/admin/clientes', meta: { title: 'Clientes', subtitle: 'Acompanhamento estratégico' } },
    { pattern: '/admin/meta-ads', meta: { title: 'Meta Ads', subtitle: 'Gestão e Otimização IA' } },
    { pattern: '/admin/metas', meta: { title: 'Metas e Objetivos', subtitle: 'Planejamento Estratégico' } },
    { pattern: '/admin/alertas', meta: { title: 'Alertas', subtitle: 'Ações prioritárias' } },
    { pattern: '/admin/performance', meta: { title: 'Performance', subtitle: 'Performance do consultor' } },
    { pattern: '/admin/consultancy/aparencia', meta: { title: 'Consultoria', subtitle: 'Aparência global' } },
    { pattern: '/admin/consultancy', meta: { title: 'Consultoria', subtitle: 'Operações e aparência' } },
    { pattern: '/admin/users', meta: { title: 'Usuários', subtitle: 'Gestão de acessos' } },
    { pattern: '/admin/financas', meta: { title: 'Finanças', subtitle: 'Controle financeiro' } },
    { pattern: '/admin/companies', meta: { title: 'Contratos', subtitle: 'Gestão de contratos e faturamento' } },
    { pattern: '/admin/planos', meta: { title: 'Planos', subtitle: 'Catálogo, preços e clones para contratos' } },
    { pattern: '/admin/instances', meta: { title: 'Instâncias', subtitle: 'WhatsApp e integrações' } },
    { pattern: '/admin/user-connections', meta: { title: 'Conexões', subtitle: 'Conexões e canais' } },
    { pattern: '/admin/agents', meta: { title: 'Agentes IA', subtitle: 'Agentes e automação' } },
    { pattern: '/admin/documentos', meta: { title: 'Documentos', subtitle: 'Arquivos para anexos do agente no WhatsApp' } },
    { pattern: '/admin/followup', meta: { title: 'Follow-up', subtitle: 'Automação de follow-up' } },
    { pattern: '/admin/notificacoes-globais', meta: { title: 'Notificações globais', subtitle: 'Transbordo humano e alertas WhatsApp' } },
    { pattern: '/admin/settings', meta: { title: 'Configurações', subtitle: 'Configurações globais' } },
    { pattern: '/admin/terms', meta: { title: 'Termos de Uso', subtitle: 'Termos e aceites' } },
    { pattern: '/admin/gestao-equipe', meta: { title: 'Gestão de Equipe', subtitle: 'Colaboradores internos Amplia' } },
    { pattern: '/admin', end: true, meta: { title: 'Dashboard', subtitle: 'Visão geral do sistema Amplia' } },
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
