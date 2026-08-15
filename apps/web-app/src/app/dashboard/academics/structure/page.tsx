import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import StructureClient from './StructureClient';

export interface Campus {
  id: string;
  name: string;
  address?: string;
}

export interface Arm {
  id: string;
  name: string;
  capacity?: number;
}

export interface Class {
  id: string;
  name: string;
  level: number;
  campusId?: string;
  arms: Arm[];
}

export default async function StructurePage() {
  const session = await auth();
  
  let campuses: Campus[] = [];
  let classes: Class[] = [];

  try {
    const campusRes = await fetchApi<{ data: Campus[] }>('/api/v1/academics/structure/campuses', {
      token: session?.accessToken,
    });
    campuses = campusRes.data || [];

    const classRes = await fetchApi<{ data: Class[] }>('/api/v1/academics/structure/classes', {
      token: session?.accessToken,
    });
    classes = classRes.data || [];
  } catch (error) {
    console.error('Failed to fetch institutional structure', error);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Institutional Structure</h2>
        <StructureClient initialCampuses={campuses} initialClasses={classes} accessToken={session?.accessToken || ''} />
      </div>
    </div>
  );
}
