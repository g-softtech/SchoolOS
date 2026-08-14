

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
