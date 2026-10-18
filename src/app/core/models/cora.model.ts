/** One conversation turn exchanged with Cora (the admin assistant). */
export interface CoraTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Request body for POST /api/cora/chat. */
export interface CoraChatRequest {
  message: string;
  language: string;
  history: CoraTurn[];
}

/** Response from POST /api/cora/chat. */
export interface CoraChatResponse {
  reply: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  toolsUsed: string[];
  /** When set, a menu route the UI should navigate to (e.g. "/employees"). */
  navigateTo?: string | null;
  /** The active language Cora is now using ("en"/"es") — may change on request. */
  language?: string | null;
  /** When set, Cora prepared an email report awaiting the user's confirmation. */
  emailOffer?: CoraEmailOffer | null;
}

/**
 * A prepared (not sent) email-report offer the user must confirm. Recipient is
 * either the logged-in user ('self') or an agency employee ('employee'),
 * resolved server-side. No free-form address.
 */
export interface CoraEmailOffer {
  recipientType: 'self' | 'employee';
  employeePublicId?: string | null;
  /** Resolved employee email, for display only. */
  email?: string | null;
  /** Employee display name, for the confirmation card. */
  recipientName?: string | null;
  subject?: string | null;
  /** Explicit email body when the user dictated content; null → use the reply text. */
  body?: string | null;
}

/** Confirmed request to send the report (recipient resolved server-side). */
export interface CoraSendReportRequest {
  recipientType: 'self' | 'employee';
  employeePublicId?: string | null;
  subject?: string | null;
  body: string;
}
