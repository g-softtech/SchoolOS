import { fetchApi } from '../api';

export interface LeaveRequestResponse {
  id: string;
  tenantId: string;
  staffId: string;
  type: 'SICK' | 'ANNUAL' | 'MATERNITY' | 'UNPAID' | 'OTHER';
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
  createdAt: string;
  updatedAt: string;
  staff?: {
    id: string;
    staffIdNumber: string;
    membership?: {
      profile?: {
        firstName: string;
        lastName: string;
        avatarUrl?: string;
      };
      user?: {
        email: string;
      };
    };
  };
}

export interface SubmitLeaveRequest {
  staffId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface SubmitMyLeaveRequest {
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ReviewLeaveRequest {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
}

export const leaveApi = {
  // Manager Endpoints
  getLeaveRequests: (status?: string, token?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchApi<LeaveRequestResponse[]>(`/api/v1/leave${query}`, { method: 'GET', token });
  },

  submitLeaveRequest: (data: SubmitLeaveRequest, token?: string) => fetchApi<LeaveRequestResponse>('/api/v1/leave', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  }),

  reviewLeaveRequest: (id: string, data: ReviewLeaveRequest, token?: string) => fetchApi<LeaveRequestResponse>(`/api/v1/leave/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
  }),

  // Self-Service Endpoints
  getMyLeaveRequests: (status?: string, token?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchApi<LeaveRequestResponse[]>(`/api/v1/leave/me${query}`, { method: 'GET', token });
  },

  submitMyLeaveRequest: (data: SubmitMyLeaveRequest, token?: string) => fetchApi<LeaveRequestResponse>('/api/v1/leave/me', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  }),
};
