import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import Link from 'next/link';
import StudentStatusClient from './StudentStatusClient';
import AddGuardianClient from './AddGuardianClient';
import EditMedicalClient from './EditMedicalClient';
import AddDisciplineClient from './AddDisciplineClient';
import EditPlacementClient, { ClassData } from './EditPlacementClient';
import IdCardSection from './IdCardSection';
import DocumentsSection from './DocumentsSection';

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

interface MedicalData {
  bloodGroup?: string;
  genotype?: string;
  allergies?: string;
  medicalConditions?: string;
  notes?: string;
}

interface DisciplineData {
  id: string;
  incidentDate: string;
  severity: string;
  description: string;
  actionTaken?: string;
}

interface StudentData {
  id: string;
  admissionNumber: string;
  enrollmentDate: string;
  currentArmId?: string;
  membership?: MembershipData;
  guardians?: GuardianData[];
}

export default async function StudentProfilePage({ params }: { params: { id: string } }) {
  const session = await auth();
  const studentId = params.id;
  
  let student: Record<string, unknown> | null = null;
  let medicalRecord: MedicalData | null = null;
  let disciplineRecords: DisciplineData[] = [];
  let classes: ClassData[] = [];
  let idCard: any = null;
  let documents: any[] = [];

  const [studentRes, medRes, discRes, classRes, idCardRes, docRes] = await Promise.allSettled([
    fetchApi<{ data: Record<string, unknown> }>(`/api/v1/students/${studentId}`, { token: session?.accessToken }),
    fetchApi<{ data: MedicalData }>(`/api/v1/students/${studentId}/medical`, { token: session?.accessToken }),
    fetchApi<{ data: DisciplineData[] }>(`/api/v1/students/${studentId}/discipline`, { token: session?.accessToken }),
    fetchApi<{ data: ClassData[] }>('/api/v1/academics/structure/classes', { token: session?.accessToken }),
    fetchApi<{ data: any }>(`/api/v1/id-cards/active/STUDENT/${studentId}`, { token: session?.accessToken }).catch(() => ({ data: null })),
    fetchApi<{ data: any[] }>(`/api/v1/documents/STUDENT/${studentId}`, { token: session?.accessToken }).catch(() => ({ data: [] }))
  ]);

  if (studentRes.status === 'fulfilled') {
    student = studentRes.value.data;
  } else {
    console.error('Failed to fetch student details', studentRes.reason);
  }

  if (medRes.status === 'fulfilled' && medRes.value.data) {
    medicalRecord = medRes.value.data;
  } else if (medRes.status === 'rejected') {
    console.error('Failed to fetch medical details', medRes.reason);
  }

  if (discRes.status === 'fulfilled' && discRes.value.data) {
    disciplineRecords = discRes.value.data;
  } else if (discRes.status === 'rejected') {
    console.error('Failed to fetch discipline details', discRes.reason);
  }

  if (classRes.status === 'fulfilled' && classRes.value.data) {
    classes = classRes.value.data;
  } else if (classRes.status === 'rejected') {
    console.error('Failed to fetch classes details', classRes.reason);
  }

  if (idCardRes.status === 'fulfilled' && (idCardRes.value as any)?.data) {
    idCard = (idCardRes.value as any).data;
  }

  if (docRes.status === 'fulfilled' && (docRes.value as any)?.data) {
    documents = (docRes.value as any).data;
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
  const currentArmId = studentData.currentArmId;
  
  // Resolve class and arm names for display
  const currentClass = classes.find(c => c.arms.some(a => a.id === currentArmId));
  const currentArm = currentClass?.arms.find(a => a.id === currentArmId);

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

      {/* Academic Placement */}
      <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Academic Placement</h3>
          <EditPlacementClient studentId={studentData.id} currentArmId={currentArmId} classes={classes} />
        </div>
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Class</dt>
              <dd className="mt-1 text-sm text-gray-900">{currentClass ? currentClass.name : 'Not Assigned'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Arm</dt>
              <dd className="mt-1 text-sm text-gray-900">{currentArm ? currentArm.name : 'Not Assigned'}</dd>
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

      <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Medical Information</h3>
          <EditMedicalClient studentId={studentData.id} initialData={medicalRecord} />
        </div>
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Blood Group</dt>
              <dd className="mt-1 text-sm text-gray-900">{medicalRecord?.bloodGroup || 'Not specified'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Genotype</dt>
              <dd className="mt-1 text-sm text-gray-900">{medicalRecord?.genotype || 'Not specified'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Allergies</dt>
              <dd className="mt-1 text-sm text-gray-900">{medicalRecord?.allergies || 'None'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Medical Conditions</dt>
              <dd className="mt-1 text-sm text-gray-900">{medicalRecord?.medicalConditions || 'None'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Additional Notes</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{medicalRecord?.notes || 'No additional notes'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Discipline History</h3>
          <AddDisciplineClient studentId={studentData.id} />
        </div>
        <div className="px-4 py-5 sm:p-6">
          {disciplineRecords.length === 0 ? (
            <p className="text-sm text-gray-500">No discipline records found.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {disciplineRecords.map((d: DisciplineData) => (
                <li key={d.id} className="py-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(d.incidentDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{d.description}</p>
                      {d.actionTaken && (
                        <p className="text-sm text-gray-500 mt-1"><span className="font-medium text-gray-700">Action:</span> {d.actionTaken}</p>
                      )}
                    </div>
                    <div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        d.severity === 'SEVERE' ? 'bg-red-100 text-red-800' :
                        d.severity === 'MAJOR' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {d.severity}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <IdCardSection studentId={studentData.id} initialIdCard={idCard} />
      <DocumentsSection ownerId={studentData.id} ownerType="STUDENT" initialDocuments={documents} />

    </div>
  );
}
