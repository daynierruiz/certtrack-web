export interface AgencyResponse {
  publicId: string;
  name: string;
  slug: string;
  timezone: string;
  country: string;
  state: string;
  briefingEnabled: boolean;
  briefingLanguage: 'en' | 'es';
  createdAt: string;
  updatedAt: string;
}

export interface AgencyBriefingSettingsRequest {
  enabled: boolean;
  language: 'en' | 'es';
}

export interface AgentBriefingResponse {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}
