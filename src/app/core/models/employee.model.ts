import { EmployeeAddress, EmployeeAddressUpdateRequest } from './address.model';
import { LanguageCode } from './applicant.model';

export type EmployeeStatus = 'APPLICANT' | 'ONBOARDING' | 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface EmployeePositionRef {
  publicId: string;
  code: string;
  name: string;
}

export interface Employee {
  publicId: string;
  agencyPublicId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  employeeCode: string | null;
  externalId: string | null;
  hireDate: string | null;
  terminationDate: string | null;
  status: EmployeeStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  address: EmployeeAddress | null;
  languages: LanguageCode[];
  languageOther: string | null;
  schoolName: string | null;
  positions?: EmployeePositionRef[];
}

export interface EmployeeUpsertRequest {
  agencyPublicId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  externalId?: string;
  hireDate?: string;
  terminationDate?: string;
  status: EmployeeStatus;
  notes?: string;
  address?: EmployeeAddressUpdateRequest;
  languages?: LanguageCode[];
  languageOther?: string;
  schoolName?: string;
}
