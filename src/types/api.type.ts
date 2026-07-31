export interface Profile {
  id: string;
  email: string;
  name?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export type User = Profile;
