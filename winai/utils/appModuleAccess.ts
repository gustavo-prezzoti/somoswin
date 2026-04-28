import type { UserDTO } from '../services/types';

export type CompanyAppModuleKey =
    | 'CRM'
    | 'WHATSAPP'
    | 'INTELLIGENT_LISTENING'
    | 'CALENDAR'
    | 'GOALS'
    | 'MARKETING'
    | 'ACTIVE_BASE'
    | 'CONSULTANCY';

export const COMPANY_APP_MODULE_KEYS: CompanyAppModuleKey[] = [
    'CRM',
    'WHATSAPP',
    'INTELLIGENT_LISTENING',
    'CALENDAR',
    'GOALS',
    'MARKETING',
    'ACTIVE_BASE',
    'CONSULTANCY',
];

export const COMPANY_APP_MODULE_LABELS: Record<CompanyAppModuleKey, string> = {
    CRM: 'CRM & Leads',
    WHATSAPP: 'Atendimento',
    INTELLIGENT_LISTENING: 'Escuta inteligente',
    CALENDAR: 'Agenda comercial',
    GOALS: 'Metas e objetivos',
    MARKETING: 'Tráfego pago',
    ACTIVE_BASE: 'Base ativa',
    CONSULTANCY: 'Consultoria estratégica',
};

export function canAccessCompanyAppModule(
    user: UserDTO | null | undefined,
    module: CompanyAppModuleKey,
): boolean {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.ampliaInternalStaff) return true;
    if (user.role === 'ADMIN' && user.company) return true;
    if (user.appFullAccess) return true;
    const g = user.appModuleGrants;
    if (!g || Object.keys(g).length === 0) return true;
    const v = g[module];
    if (v === undefined || v === null) return true;
    return v !== false;
}
