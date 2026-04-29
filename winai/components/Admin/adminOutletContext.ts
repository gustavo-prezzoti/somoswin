import type { UserDTO } from '../../services/types';

/** Contexto do `<Outlet />` dentro de `AdminLayout` — perfil já validado pela API (`/user/me`). */
export type AdminOutletContext = {
    adminUser: UserDTO;
};
