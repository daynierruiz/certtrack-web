export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  agencyPublicId: string;
  email: string;
  password: string;
  fullName: string;
  invitationToken?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userPublicId: string;
  agencyPublicId: string;
  role: string;
}

export interface MeResponse {
  userPublicId: string;
  agencyPublicId: string;
  agencyName: string;
  employeePublicId: string | null;
  email: string;
  fullName: string;
  role: string;
}

export interface RefreshRequest {
  refreshToken: string;
}
