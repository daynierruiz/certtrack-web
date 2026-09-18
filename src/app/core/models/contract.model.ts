export type ContractStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'EXPIRED' | 'REVOKED';

export interface ContractTemplatePositionRef {
  publicId: string;
  code: string;
  name: string;
}

export interface ContractTemplate {
  publicId: string;
  agencyPublicId: string;
  name: string;
  description: string | null;
  htmlBody: string;
  isActive: boolean;
  positions?: ContractTemplatePositionRef[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractTemplateCreateRequest {
  agencyPublicId: string;
  name: string;
  description?: string;
  htmlBody: string;
  positionPublicIds?: string[];
}

export interface ContractTemplateUpdateRequest {
  name: string;
  description?: string;
  htmlBody: string;
  isActive: boolean;
  positionPublicIds?: string[];
}

export interface Contract {
  publicId: string;
  agencyPublicId: string;
  employeePublicId: string;
  employeeName: string;
  templatePublicId: string | null;
  title: string;
  status: ContractStatus;
  documentHash: string | null;
  sentAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  effectiveDate: string | null;
  employeeSigned: boolean;
  employerSigned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContractGenerateRequest {
  agencyPublicId: string;
  employeePublicId: string;
  templatePublicIds: string[];
  title: string;
  position?: string;
  effectiveDate?: string;
  // Optional compensation & schedule terms (Schedule 6.2 of the HHA agreement)
  payRate?: string;
  payUnit?: string;
  scheduleDays?: string;
  scheduleHoursFrom?: string;
  scheduleHoursTo?: string;
}

export interface ContractSignRequest {
  signatureBase64: string;
  consentText: string;
}
