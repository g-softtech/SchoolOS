import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import Link from 'next/link';
import StudentStatusClient from './StudentStatusClient';
import AddGuardianClient from './AddGuardianClient';

interface ProfileData {
  firstName: string;
  lastName: string;
}

interface MembershipData {
  state: string;
  profile: ProfileData;
}

interface GuardianData {
  id: string;
  relationship: string;
  guardian?: {
    membership?: MembershipData;
  };
}

interface StudentData {
  id: string;
  admissionNumber: string;
  enrollmentDate: string;
  membership?: MembershipData;
  guardians?: GuardianData[];
}

export default async function StudentProfilePage({ params }: { params: { id: string } }) {
  const session = await auth();
  const studentId = params.id;
  
  let student: Record<string, unknown> | null = null;
  try {
    const res = await fetchApi<{ data: Record<string, unknown> }>(`/api/v1/students/${studentId}`, {
      token: session?.accessToken,
    });
    student = res.data;
  } catch (error) {
    console.error('Failed to fetch student details', error);
  }

  if (!student) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-800 p-4 rounded-md">
          Student not found or you do not have permission to view this record.
        </div>
        <Link href="/dashboard/students" className="mt-4 inline-block text-blue-600 hover:underline">
          &larr; Back to Directory
        </Link>
      </div>
    );
  }

  const studentData = student as unknown as StudentData; // Typecast for UI since it's a dynamic structure from API
  const profile = studentData.membership?.profile || ({} as ProfileData);
  const currentState = studentData.membership?.state || 'UNKNOWN';
  const guardians = studentData.guardians || [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/dashboard/students" className="text-sm text-gray-500 hover:text-gray-900">
          &larr; Directory
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">Student Profile</span>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {profile.firstName} {profile.lastName}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Admission Number: {studentData.admissionNumber}
            </p>
          </div>
          <div>
            <StudentStatusClient studentId={studentData.id} currentState={currentState} />
          </div>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">First Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile.firstName}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Last Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile.lastName}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Enrollment Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(studentData.enrollmentDate).toLocaleDateString()}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {currentState}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Guardians</h3>
          <AddGuardianClient studentId={studentData.id} />
        </div>
        <div className="px-4 py-5 sm:p-6">
          {guardians.length === 0 ? (
            <p className="text-sm text-gray-500">No guardians linked.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {guardians.map((g: GuardianData) => {
                const gProfile = g.guardian?.membership?.profile || { firstName: '', lastName: '' };
                return (
                  <li key={g.id} className="py-4 flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{gProfile.firstName} {gProfile.lastName}</p>
                      <p className="text-sm text-gray-500">Relationship: {g.relationship}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}
