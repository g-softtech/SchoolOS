import { fetchApi } from '../api';

export interface StaffListResponse {
  id: string;
  staffIdNumber: string;
  departmentId?: string;
  designation?: string;
  createdAt: string;
  employment?: {
    id: string;
    status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'SUSPENDED';
    hireDate: string;
    contractType?: string;
  };
  department?: {
    id: string;
    name: string;
  };
  membership: {
    id: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
    user: {
      email: string;
    };
  };
}

export interface EligibleMembershipResponse {
  id: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  user: {
    email: string;
  };
}

export interface DepartmentResponse {
  id: string;
  name: string;
  description?: string;
}

export interface HireStaffRequest {
  membershipId: string;
  staffIdNumber: string;
  departmentId?: string;
  designation?: string;
  hireDate: string;
  contractType?: string;
}

export interface UpdateEmploymentRequest {
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'SUSPENDED';
  terminationDate?: string;
}

export const staffApi = {
  getStaffList: (token?: string) => fetchApi<StaffListResponse[]>('/api/v1/staff', { method: 'GET', token }),

  getStaffById: (staffId: string, token?: string) => fetchApi<StaffListResponse>(`/api/v1/staff/${staffId}`, { method: 'GET', token }),

  getEligibleMemberships: (token?: string) => fetchApi<EligibleMembershipResponse[]>('/api/v1/staff/eligible-memberships', { method: 'GET', token }),

  hireStaff: (data: HireStaffRequest, token?: string) => fetchApi<unknown>('/api/v1/staff', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  }),

  updateEmploymentStatus: (staffId: string, data: UpdateEmploymentRequest, token?: string) => fetchApi<unknown>(`/api/v1/staff/${staffId}/employment/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
  }),

  getDepartments: (token?: string) => fetchApi<DepartmentResponse[]>('/api/v1/staff/departments', { method: 'GET', token }),
};
