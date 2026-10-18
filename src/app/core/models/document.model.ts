export interface DocumentResponse {
  publicId: string;
  agencyPublicId: string;
  credentialPublicId: string | null;
  employeePublicId: string | null;
  uploadedByUserPublicId: string | null;
  uploadedByName: string | null;
  originalFilename: string;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  sha256: string | null;
  aiStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiExtractionResponse {
  issueDate: string | null;
  expirationDate: string | null;
  issuer: string | null;
  credentialNumber: string | null;
  confidence: number;
  model: string;
  costCents: number;
}
