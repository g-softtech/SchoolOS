import { fetchApi } from '../api';

export interface Exam {
  id: string;
  tenantId: string;
  termId: string;
  subjectId: string;
  title: string;
  totalMarks: number;
  isCBT: boolean;
  date: string;
  createdAt: string;
  updatedAt: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  term?: {
    id: string;
    name: string;
  };
}

export interface CreateExamDto {
  termId: string;
  subjectId: string;
  title: string;
  totalMarks: number;
  isCBT: boolean;
  date: string;
}

export interface EligibleCandidate {
  id: string; // result ID (could be new or existing)
  studentId: string;
  examId: string;
  student: {
    id: string;
    admissionNumber: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  score: number | null;
  isNew: boolean;
}

export interface BatchEnterResultItem {
  studentId: string;
  score: number;
}

export const examinationsApi = {
  getExams: (token?: string) => {
    return fetchApi<Exam[]>('/api/v1/exams', { method: 'GET', token });
  },

  getExamById: (id: string, token?: string) => {
    return fetchApi<Exam>(`/api/v1/exams/${id}`, { method: 'GET', token });
  },

  createExam: (data: CreateExamDto, token?: string) => {
    return fetchApi<Exam>('/api/v1/exams', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  deleteExam: (id: string, token?: string) => {
    return fetchApi<void>(`/api/v1/exams/${id}`, { method: 'DELETE', token });
  },

  getEligibleCandidates: (examId: string, token?: string) => {
    return fetchApi<EligibleCandidate[]>(`/api/v1/exams/${examId}/results/eligible`, { method: 'GET', token });
  },

  batchEnterResults: (examId: string, results: BatchEnterResultItem[], token?: string) => {
    return fetchApi<unknown>(`/api/v1/exams/${examId}/results/batch`, {
      method: 'POST',
      body: JSON.stringify({ results }),
      token,
    });
  },
};
