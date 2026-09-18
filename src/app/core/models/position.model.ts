export interface PositionResponse {
  publicId: string;
  agencyPublicId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  requirements: RequirementResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface RequirementResponse {
  publicId: string;
  credentialTypePublicId: string;
  credentialTypeName: string;
  credentialTypeCode: string;
  isMandatory: boolean;
}

export interface PositionUpsertRequest {
  agencyPublicId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  requirements: RequirementRequest[];
}

export interface RequirementRequest {
  credentialTypePublicId: string;
  isMandatory: boolean;
}

export interface EmployeeAssignmentRequest {
  employeePublicId: string;
}

export type EligibilityStatus = 'ELIGIBLE' | 'PARTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE';

export interface RequirementStatusResponse {
  credentialTypePublicId: string;
  credentialTypeName: string;
  credentialTypeCode: string;
  isMandatory: boolean;
  met: boolean;
  credentialStatus: string | null;
  credentialPublicId: string | null;
}

export interface EmployeeEligibilityResponse {
  employeePublicId: string;
  employeeName: string;
  positionPublicId: string;
  positionName: string;
  status: EligibilityStatus;
  totalMandatory: number;
  metMandatory: number;
  totalOptional: number;
  metOptional: number;
  percentComplete: number;
  requirements: RequirementStatusResponse[];
}

export interface PositionEligibilitySummary {
  positionPublicId: string;
  positionName: string;
  totalAssigned: number;
  fullyEligible: number;
  partiallyEligible: number;
  notEligible: number;
  employees: EmployeeEligibilityResponse[];
}

export interface PositionEligibilitySummaryDto {
  positionPublicId: string;
  positionName: string;
  totalAssigned: number;
  fullyEligible: number;
  partiallyEligible: number;
  notEligible: number;
}
