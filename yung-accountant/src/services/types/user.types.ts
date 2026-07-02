// services/types/user.types.ts
// Tipos compartidos para auth y user services

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number;
  profilePic?: string;
  clientId: string;
  role: string;
  username?: string;
  displayName?: string;
  password?: string;
  plan?: 'free' | 'premium' | 'business';
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  followers?: string[];
  following?: string[];
  joinedAt?: string;
  accessToken?: string;
  refreshToken?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicProfileUser {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  location?: string;
  profilePic?: string;
  avatar?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  createdAt: string;
  plan?: string;
}

// UserProfile extiende de User
export interface UserProfile extends User {
  keycloakId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;         // Now set as HttpOnly cookie — optional in body
  refreshToken?: string;  // Now set as HttpOnly cookie — optional in body
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  clientId: string;
  role: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  age: number;
  clientId: string;
  role: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  clientId: string;
  role: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  age: number;
  clientId?: string;
  role?: string;
  bio?: string;
  location?: string;
  website?: string;
  profilePic?: string;
}

export interface UpdateUserResponse {
  message: string;
  firstName: string;
  lastName: string;
  age: number;
  clientId?: string;
  role?: string;
  bio?: string;
  location?: string;
  website?: string;
  keycloakUpdated: boolean;
  roleChanged?: boolean;   
  clientChanged?: boolean;
}

export interface Client {
  id: string;
  name: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
}