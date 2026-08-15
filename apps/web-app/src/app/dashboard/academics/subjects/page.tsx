import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import SubjectsClient from './SubjectsClient';
import { Class } from '../structure/page';

export interface SubjectGroup {
  id: string;
  name: string;
  description?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  groupId?: string;
}

export default async function SubjectsPage() {
  const session = await auth();
  
  let subjectGroups: SubjectGroup[] = [];
  let subjects: Subject[] = [];
  let classes: Class[] = [];

  try {
    const groupsRes = await fetchApi<{ data: SubjectGroup[] }>('/api/v1/academics/structure/subject-groups', {
      token: session?.accessToken,
    });
    subjectGroups = groupsRes.data || [];

    const subjectsRes = await fetchApi<{ data: Subject[] }>('/api/v1/academics/structure/subjects', {
      token: session?.accessToken,
    });
    subjects = subjectsRes.data || [];

    // We also need classes to do subject mapping
    const classRes = await fetchApi<{ data: Class[] }>('/api/v1/academics/structure/classes', {
      token: session?.accessToken,
    });
    classes = classRes.data || [];
  } catch (error) {
    console.error('Failed to fetch subjects structure', error);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Subjects & Curriculum</h2>
        <SubjectsClient 
          initialGroups={subjectGroups} 
          initialSubjects={subjects} 
          classes={classes}
          accessToken={session?.accessToken || ''} 
        />
      </div>
    </div>
  );
}
