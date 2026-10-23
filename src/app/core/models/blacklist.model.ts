export interface BlacklistEntry {
  publicId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  reason: string | null;
  sourceEmployeePublicId: string | null;
  addedByName: string | null;
  createdAt: string;
}

export interface BlacklistEntryRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  reason?: string;
}
