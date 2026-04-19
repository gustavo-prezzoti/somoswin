/**
 * Empresa — perfil (dados do negócio), membros e convites
 */

import { httpClient } from './http-client';
import type {
    AccessInvitationDTO,
    CompanyMemberDTO,
    CompanyProfileDTO,
} from '../types';

export interface PatchCompanyProfileBody {
    segment?: string;
    website?: string;
    instagramHandle?: string;
    revenueRange?: string;
    teamSize?: string;
    cityState?: string;
}

export interface CreateInvitationBody {
    email: string;
    invitedName?: string;
    jobTitle?: string;
    role: 'USER' | 'ADMIN';
}

export const companyService = {
    async getProfile(): Promise<CompanyProfileDTO> {
        return httpClient.get<CompanyProfileDTO>('/company/profile');
    },

    async patchProfile(body: PatchCompanyProfileBody): Promise<CompanyProfileDTO> {
        return httpClient.patch<CompanyProfileDTO>('/company/profile', body);
    },

    async listMembers(): Promise<CompanyMemberDTO[]> {
        return httpClient.get<CompanyMemberDTO[]>('/company/members');
    },

    async listInvitations(): Promise<AccessInvitationDTO[]> {
        return httpClient.get<AccessInvitationDTO[]>('/company/invitations');
    },

    async createInvitation(body: CreateInvitationBody): Promise<AccessInvitationDTO> {
        return httpClient.post<AccessInvitationDTO>('/company/invitations', body);
    },

    async revokeInvitation(id: string): Promise<void> {
        await httpClient.delete(`/company/invitations/${id}`);
    },
};

export default companyService;
