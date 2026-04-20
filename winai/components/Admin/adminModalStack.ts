/**
 * Empilhamento do painel Amplia /admin:
 * - Sidebar: z-[1000] (AdminSidebar)
 * - Modais em páginas: z-[1100] (acima do menu)
 * - ModalContext / alertas globais: z-[10050]+
 */

export const ADMIN_Z_SIDEBAR = 1000;
export const ADMIN_Z_PAGE_MODAL = 1100;

/** Camada 1: viewport cheia + scroll; acima do sidebar. */
export const ADMIN_MODAL_BACKDROP_DEFAULT =
    'fixed inset-0 z-[1100] overflow-y-auto bg-black/50';

export const ADMIN_MODAL_BACKDROP_BLUR =
    'fixed inset-0 z-[1100] overflow-y-auto bg-black/60 backdrop-blur-sm';

/**
 * Camada 2: centraliza horizontalmente, padding vertical uniforme, sem my- no painel.
 * items-start evita “buraco” no topo quando o conteúdo é alto.
 */
export const ADMIN_MODAL_INNER =
    'min-h-full w-full flex items-start justify-center px-4 sm:px-6 py-6';
