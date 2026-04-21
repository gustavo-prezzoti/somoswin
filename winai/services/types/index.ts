/**
 * Tipos e interfaces para a API
 */

// ============================================
// Auth Types
// ============================================

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    user: UserDTO;
    /** Próxima ação obrigatória definida pelo backend (fonte única de verdade). */
    nextAction?: NextAction;
}

export type NextAction =
    | 'MUST_CHANGE_PASSWORD'
    | 'MUST_ACCEPT_TERMS'
    | 'NEEDS_CONTRACT_INFO'
    | 'SUBSCRIPTION_EXPIRED'
    | 'SUBSCRIPTION_INACTIVE_MEMBER'
    | 'SUCCESS';

export type AmpliaAdminRole = UserRole | 'SUPER_ADMIN';

export interface UserDTO {
    id: string;
    email: string;
    name: string;
    role: AmpliaAdminRole | UserRole;
    plan: PlanType | 'INTERNAL_STAFF';
    company: CompanyDTO | null;
    avatarUrl?: string | null;
    phone?: string | null;
    jobTitle?: string | null;
    mustChangePassword?: boolean;
    /** Colaborador interno Amplia (sem assinatura). */
    ampliaInternalStaff?: boolean;
    ampliaStaffType?: string | null;
    ampliaStaffRoleId?: string | null;
    ampliaStaffRoleName?: string | null;
    ampliaStaffPermissions?: string[];
    ampliaStaffFullAccess?: boolean;
}

export interface CompanyDTO {
    id: string;
    name: string;
    segment: string;
    plan: PlanType;
}

/** GET/PATCH /company/profile — dados do negócio */
export interface CompanyProfileDTO {
    id: string;
    name: string;
    segment: string;
    website: string | null;
    instagramHandle: string | null;
    revenueRange: string | null;
    teamSize: string | null;
    cityState: string | null;
    whatsapp: string | null;
    leadVolume: string | null;
}

export interface CompanyMemberDTO {
    id: string;
    email: string;
    name: string;
    role: string;
    jobTitle: string | null;
    isActive: boolean;
    avatarUrl: string | null;
    /** Responsável financeiro (primeiro usuário da empresa). */
    isBillingOwner?: boolean;
}

export interface AccessInvitationDTO {
    id: string;
    email: string;
    invitedName: string | null;
    jobTitle: string | null;
    role: string;
    status: string;
    createdAt: string;
    expiresAt: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';
export type PlanType = 'STARTER' | 'PROFESSIONAL' | 'ULTRA' | 'ENTERPRISE';

// ============================================
// Notification Types
// ============================================

export interface NotificationDTO {
    id: string;
    title: string;
    message: string | null;
    read: boolean;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    actionUrl: string | null;
    createdAt: string;
}

// ============================================
// Request Types
// ============================================

export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}

/** Atribuição (UTM / click ids) lida da URL e enviada no cadastro — persistida só no backend. */
export interface RegisterAttribution {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    gclid?: string;
    fbclid?: string;
    msclkid?: string;
    capturedAt?: string;
}

export interface RegisterRequest {
    companyName: string;
    segment: string;
    email: string;
    whatsapp: string;
    password: string;
    leadVolume?: string;
    attribution?: RegisterAttribution | null;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

// ============================================
// Response Types
// ============================================

export interface MessageResponse {
    message: string;
    success: boolean;
}

export interface ApiErrorResponse {
    message: string;
    error?: string;
    status?: number;
    timestamp?: string;
    path?: string;
}

// ============================================
// User Storage Types (para localStorage)
// ============================================

export interface StoredUser {
    email: string;
    name: string;
    role: UserRole;
    plan: string; // Nome amigável do plano
    isLoggedIn: boolean;
    company: CompanyDTO | null;
    mustChangePassword?: boolean;
    ampliaInternalStaff?: boolean;
}

// ============================================
// Utility Types
// ============================================

export interface PaginatedResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

export interface SortParams {
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
}

export interface PaginationParams extends SortParams {
    page?: number;
    size?: number;
}
