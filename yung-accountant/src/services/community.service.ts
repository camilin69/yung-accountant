// services/community.service.ts
import { communityAxios } from './api/axios.config';
import type { Post, Comment } from '../types';

export interface CreatePostRequest {
  title: string;
  content: string;
  tags?: string[];
  imageUrl?: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  tags?: string[];
  imageUrl?: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followersCount: number;
  postsCount: number;
}

export interface UserStats {
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export const communityService = {
  // Posts - Arreglado para manejar array directo
  async getPosts(page = 1, limit = 10): Promise<{ posts: Post[]; totalPages: number }> {
    const response = await communityAxios.get('/community/posts', { params: { page, limit } });
    
    // Si la respuesta es un array directamente
    if (Array.isArray(response.data)) {
      return {
        posts: response.data,
        totalPages: response.data.length < limit ? page : page + 1 // Si hay menos del límite, es la última página
      };
    }
    
    // Si la respuesta ya tiene el formato esperado
    return response.data;
  },

  async getPostById(id: string): Promise<Post> {
    const response = await communityAxios.get(`/community/posts/${id}`);
    return response.data;
  },

  async createPost(data: CreatePostRequest): Promise<Post> {
    const response = await communityAxios.post('/community/posts', data);
    return response.data;
  },

  async updatePost(id: string, data: UpdatePostRequest): Promise<Post> {
    const response = await communityAxios.put(`/community/posts/${id}`, data);
    return response.data;
  },

  async deletePost(id: string): Promise<{ message: string }> {
    const response = await communityAxios.delete(`/community/posts/${id}`);
    return response.data;
  },

  async likePost(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const response = await communityAxios.post(`/community/posts/${postId}/like`);
    return response.data;
  },

  // Comments
  async getComments(postId: string): Promise<Comment[]> {
    const response = await communityAxios.get(`/community/posts/${postId}/comments`);
    return response.data;
  },

  async addComment(postId: string, data: CreateCommentRequest): Promise<Comment> {
    const response = await communityAxios.post(`/community/posts/${postId}/comments`, data);
    return response.data;
  },

  async updateComment(commentId: string, data: CreateCommentRequest): Promise<Comment> {
    const response = await communityAxios.put(`/comments/${commentId}`, data);
    return response.data;
  },

  async deleteComment(commentId: string): Promise<{ message: string }> {
    const response = await communityAxios.delete(`/comments/${commentId}`);
    return response.data;
  },

  async likeComment(commentId: string): Promise<{ liked: boolean; likesCount: number }> {
    const response = await communityAxios.post(`/comments/${commentId}/like`);
    return response.data;
  },

  // Replies
  async addReply(commentId: string, data: CreateCommentRequest): Promise<Comment> {
    const response = await communityAxios.post(`/comments/${commentId}/replies`, data);
    return response.data;
  },

  // Search & Recommendations
  async searchPosts(query: string): Promise<Post[]> {
    const response = await communityAxios.get(`/community/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    const response = await communityAxios.get(`/community/search/users?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  async getRecommendedPosts(): Promise<Post[]> {
    const response = await communityAxios.get('/community/recommended');
    return response.data;
  },

  async getPostsByTag(tag: string): Promise<Post[]> {
    const response = await communityAxios.get(`/community/tags/${tag}`);
    return response.data;
  },

  async followUser(userId: string): Promise<{ message: string }> {
    const response = await communityAxios.post(`/community/users/${userId}/follow`);
    return response.data;
  },

  async unfollowUser(userId: string): Promise<{ message: string }> {
    const response = await communityAxios.delete(`/community/users/${userId}/follow`);
    return response.data;
  },

  async isFollowing(targetUserId: string): Promise<{ isFollowing: boolean }> {
    // CORREGIDO: Ruta correcta
    const response = await communityAxios.get(`/community/users/${targetUserId}/is-following`);
    return response.data;
  },

  async getUserStats(username: string): Promise<UserStats> {
    // CORREGIDO: Ruta correcta
    const response = await communityAxios.get(`/community/users/${username}/stats`);
    return response.data;
  },

};