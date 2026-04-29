/**
 * Logs do fluxo Amplia Admin (/admin/login → /admin).
 * Ative com: import.meta.env.VITE_DEBUG_ADMIN_FLOW=true no build,
 * ou no console do navegador: localStorage.setItem('DEBUG_ADMIN_FLOW','1') e recarregue.
 */

const PREFIX = '[AmpliaAdmin]';

function isEnabled(): boolean {
    if (import.meta.env.VITE_DEBUG_ADMIN_FLOW === 'true') return true;
    if (import.meta.env.DEV) return true;
    try {
        return typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_ADMIN_FLOW') === '1';
    } catch {
        return false;
    }
}

export function adminFlowLog(step: string, payload?: Record<string, unknown>): void {
    if (!isEnabled()) return;
    if (payload && Object.keys(payload).length > 0) {
        console.info(PREFIX, step, payload);
    } else {
        console.info(PREFIX, step);
    }
}
