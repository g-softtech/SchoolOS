export enum StudentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  WITHDRAWN = 'WITHDRAWN',
  GRADUATED = 'GRADUATED',
  ALUMNI = 'ALUMNI',
  ARCHIVED = 'ARCHIVED'
}

export enum GuardianRelationshipType {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  GUARDIAN = 'GUARDIAN',
  EMERGENCY_CONTACT = 'EMERGENCY_CONTACT',
  SPONSOR = 'SPONSOR'
}

export interface CreateStudentProfileDto {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  nationality?: string;
  religion?: string;
  bloodGroup?: string;
  allergies?: string;
  photoKey?: string;
}
