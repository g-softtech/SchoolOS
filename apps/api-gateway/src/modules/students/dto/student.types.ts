

export enum GuardianRelationshipType {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  SIBLING = 'SIBLING',
  UNCLE = 'UNCLE',
  AUNT = 'AUNT',
  GRANDPARENT = 'GRANDPARENT',
  OTHER = 'OTHER'
}

export interface ProvisionGuardianDto {
  firstName: string;
  lastName: string;
  email: string;
  relationshipType: GuardianRelationshipType;
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
