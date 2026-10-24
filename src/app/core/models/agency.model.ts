export interface AgencyResponse {
  publicId: string;
  name: string;
  slug: string;
  timezone: string;
  country: string;
  state: string;
  contactEmail: string | null;
  briefingEnabled: boolean;
  briefingLanguage: 'en' | 'es';
  hasLogo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyUpsertRequest {
  name: string;
  slug: string;
  timezone: string;
  country: string;
  state: string;
  contactEmail?: string | null;
  briefingEnabled?: boolean;
  briefingLanguage?: 'en' | 'es';
}

export interface AgencyBriefingSettingsRequest {
  enabled: boolean;
  language: 'en' | 'es';
}

export interface AgencyContactSettingsRequest {
  /** Blank clears the agency's Reply-To; emails then fall back to the platform address. */
  contactEmail: string | null;
}

export interface AgentBriefingResponse {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}
