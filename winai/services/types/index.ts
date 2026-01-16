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
}

export interface UserDTO {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    plan: PlanType;
    company: CompanyDTO | null;
    avatarUrl?: string | null;
    phone?: string | null;
}

export interface CompanyDTO {
    id: string;
    name: string;
    segment: string;
    plan: PlanType;
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

export interface RegisterRequest {
    companyName: string;
    segment: string;
    email: string;
    whatsapp: string;
    password: string;
    leadVolume?: string;
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
