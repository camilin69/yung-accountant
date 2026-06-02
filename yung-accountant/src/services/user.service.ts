// services/user.service.ts
import { usersAxios } from './api/axios.config';
import { ENDPOINTS } from './api/endpoints';
import type {
  UserProfile,
  UpdateUserRequest,
  UpdateUserResponse,
  PublicProfileUser
} from './types/user.types';

export const userService = {
  async getMyProfile(): Promise<UserProfile> {
    const response = await usersAxios.get<UserProfile>(ENDPOINTS.USERS.ME);
    return response.data;
  },
  
  async getUserByEmail(email: string): Promise<UserProfile> {
    const response = await usersAxios.get<UserProfile>(ENDPOINTS.USERS.BY_EMAIL(email));
    return response.data;
  },
  
  async getUserByUsername(username: string): Promise<PublicProfileUser> {
    const response = await usersAxios.get(`/users/by-username/${username}`);
    return response.data;
  },

  async updateMyProfile(data: UpdateUserRequest): Promise<UpdateUserResponse> {
    const response = await usersAxios.put<UpdateUserResponse>(
      ENDPOINTS.USERS.UPDATE,
      data
    );
    return response.data;
  },
  
  async deleteMyAccount(): Promise<{ message: string }> {
    const response = await usersAxios.delete<{ message: string }>(
      ENDPOINTS.USERS.DELETE
    );
    return response.data;
  },
  
  async followUser(userId: string): Promise<{ message: string }> {
    const response = await usersAxios.post<{ message: string }>(
      ENDPOINTS.USERS.FOLLOW,
      { userId }
    );
    return response.data;
  },
  
  async unfollowUser(userId: string): Promise<{ message: string }> {
    const response = await usersAxios.post<{ message: string }>(
      ENDPOINTS.USERS.UNFOLLOW,
      { userId }
    );
    return response.data;
  },
};