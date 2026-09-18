import { PositionEligibilitySummaryDto } from './position.model';

export interface DashboardResponse {
  agencyPublicId: string;
  employees: EmployeeSummary;
  credentials: CredentialSummary;
  complianceRate: number;
  upcomingExpirations: UpcomingExpiration[];
  positionEligibility: PositionEligibilitySummaryDto[];
}

export interface EmployeeSummary {
  total: number;
  active: number;
  inactive: number;
  terminated: number;
  applicants: number;
  onboarding: number;
}

export interface CredentialSummary {
  total: number;
  valid: number;
  expiringSoon: number;
  critical: number;
  expired: number;
  pendingReview: number;
}

export interface UpcomingExpiration {
  credentialPublicId: string;
  employeeName: string;
  credentialTypeName: string;
  expirationDate: string;
  status: string;
  daysUntilExpiry: number;
}
