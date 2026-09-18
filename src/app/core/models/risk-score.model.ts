export type RiskLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface RiskFactor {
  code: string;
  description: string;
  points: number;
}

export interface RiskScore {
  employeePublicId: string;
  employeeName: string;
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}
