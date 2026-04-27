// types/user.types.ts

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  password: string,
  plan: 'free' | 'premium' | 'business';
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  followers: string[];
  following: string[];
  joinedAt: string;
  accessToken?: string;
  refreshToken?: string;
}