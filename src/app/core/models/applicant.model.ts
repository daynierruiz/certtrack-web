import { EmployeeStatus } from './employee.model';
import { EmployeeAddressUpdateRequest } from './address.model';

export type LanguageCode = 'ENGLISH' | 'SPANISH' | 'HAITIAN_CREOLE' | 'OTHER';

export const LANGUAGE_OPTIONS: { value: LanguageCode; label: string }[] = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'SPANISH', label: 'Spanish' },
  { value: 'HAITIAN_CREOLE', label: 'Haitian Creole' },
  { value: 'OTHER', label: 'Other' }
];

export interface ApplicantRegisterRequest {
  agencySlug?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  positionPublicId: string;
  languages: LanguageCode[];
  languageOther?: string;
  schoolName: string;
  address: EmployeeAddressUpdateRequest;
  /** Honeypot — must be empty. Bots that fill all inputs get silently rejected. */
  website?: string;
}

export interface ApplicantResponse {
  publicId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  positionName: string;
  positionPublicId: string | null;
  status: EmployeeStatus;
  applicationDate: string | null;
  createdAt: string;
  languages: LanguageCode[];
  languageOther: string | null;
  schoolName: string | null;
}

export interface PublicPositionResponse {
  publicId: string;
  name: string;
  description: string | null;
}

export interface PublicAgencyInfo {
  name: string;
  slug: string;
}

export interface SetupPasswordRequest {
  token: string;
  password: string;
}

export interface SetupTokenResponse {
  email: string;
  valid: boolean;
}
