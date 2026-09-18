export type CredentialStatus = 'VALID' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED' | 'PENDING_REVIEW' | 'SUPERSEDED';

export type CredentialCategory =
  | 'IDENTITY'
  | 'INSURANCE'
  | 'CERTIFICATION'
  | 'MEDICAL'
  | 'TRAINING'
  | 'FINANCIAL'
  | 'OTHER';

export const CREDENTIAL_CATEGORY_LABELS: Record<CredentialCategory, string> = {
  IDENTITY: 'Identity Documents',
  INSURANCE: 'Insurance',
  CERTIFICATION: 'Certifications',
  MEDICAL: 'Medical',
  TRAINING: 'In-Services (Training)',
  FINANCIAL: 'Financial / Payroll',
  OTHER: 'Other'
};

export const CREDENTIAL_CATEGORY_ICONS: Record<CredentialCategory, string> = {
  IDENTITY: 'badge',
  INSURANCE: 'shield',
  CERTIFICATION: 'workspace_premium',
  MEDICAL: 'medical_services',
  TRAINING: 'school',
  FINANCIAL: 'account_balance',
  OTHER: 'folder'
};

/** Display order — Identity first (legal/setup), then Insurance, etc. */
export const CREDENTIAL_CATEGORY_ORDER: CredentialCategory[] = [
  'IDENTITY', 'INSURANCE', 'CERTIFICATION', 'MEDICAL', 'TRAINING', 'FINANCIAL', 'OTHER'
];

export interface Credential {
  publicId: string;
  agencyPublicId: string;
  employeePublicId: string;
  credentialTypePublicId: string;
  issueDate: string | null;
  expirationDate: string | null;
  status: CredentialStatus;
  statusComputedAt: string | null;
  issuer: string | null;
  credentialNumber: string | null;
  notes: string | null;
  reviewNotes: string | null;
  verifiedByUserPublicId: string | null;
  verifiedAt: string | null;
  lastNotificationSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialUpsertRequest {
  agencyPublicId: string;
  employeePublicId: string;
  credentialTypePublicId: string;
  issueDate?: string;
  expirationDate?: string;
  issuer?: string;
  credentialNumber?: string;
  notes?: string;
  verifiedByUserPublicId?: string;
}

export interface CredentialReviewRequest {
  approved: boolean;
  reviewNotes?: string;
}

export interface CredentialType {
  publicId: string;
  agencyPublicId: string | null;
  code: string;
  name: string;
  description: string | null;
  defaultValidityMonths: number | null;
  renewalWarningDays: number;
  criticalWarningDays: number;
  requiresDocument: boolean;
  isActive: boolean;
  category: CredentialCategory;
  createdAt: string;
  updatedAt: string;
}
