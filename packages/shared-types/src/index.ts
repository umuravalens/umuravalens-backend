export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export type ScreeningStatus = "pending" | "processing" | "completed";

export interface ScreeningResult {
  applicantId: string;
  rank: number;
  score: number;
  notes: string;
}
