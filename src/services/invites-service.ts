import { apiClient } from '@/lib/api-client';
import type { InviteAcceptResponse, InvitePreview, MyInviteResponse } from '@/types/invite';

export const invitesService = {
  async getMyInvite(): Promise<MyInviteResponse> {
    return apiClient.get<MyInviteResponse>('/api/v1/invites/me');
  },

  async getInvitePreview(code: string): Promise<InvitePreview> {
    const safeCode = encodeURIComponent(code.trim());
    return apiClient.get<InvitePreview>(`/api/v1/invites/${safeCode}`, {
      skipAuth: true,
      skipRefresh: true,
    });
  },

  async acceptInvite(code: string): Promise<InviteAcceptResponse> {
    const safeCode = encodeURIComponent(code.trim());
    return apiClient.post<InviteAcceptResponse>(`/api/v1/invites/${safeCode}/accept`);
  },
};
