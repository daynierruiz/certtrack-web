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

/**
 * Minimal employee projection for the map (audit M7). The backend /employees/map
 * endpoint returns ONLY these fields — no street address, postal code, email, phone,
 * codes, notes or dates — and never TERMINATED staff.
 */
export interface EmployeeMapPoint {
  publicId: string;
  firstName: string;
  lastName: string;
  status: EmployeeStatus;
  languages: LanguageCode[];
  positions?: EmployeePositionRef[];
  address: {
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
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
