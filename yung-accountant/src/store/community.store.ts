// store/community.store.ts - Redis como única fuente de cache
import { create } from 'zustand';
import type { Post, Comment } from '../types';
import { communityService, type UserStats } from '../services/community.service';
import { useUserStore } from './user.store';

interface CommunityStore {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  isLoaded: boolean;

  // Posts
  fetchPosts: (reset?: boolean, followingOnly?: boolean) => Promise<void>;
  fetchPostById: (postId: string) => Promise<Post | null>;
  addPost: (data: { title: string; content: string; tags?: string[]; imageUrl?: string }) => Promise<Post | null>;
  updatePost: (id: string, updates: { title?: string; content?: string; tags?: string[]; imageUrl?: string }) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;
  likePost: (postId: string) => Promise<void>;
  
  // Comments
  addComment: (postId: string, content: string) => Promise<Comment | null>;
  updateComment: (commentId: string, content: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  likeComment: (commentId: string) => Promise<void>;
  addReply: (commentId: string, content: string) => Promise<Comment | null>;

  // Feed
  fetchPersonalizedFeed: () => Promise<void>;
  recordView: (postId: string) => Promise<void>;

  
  // Search & Recommendations
  fetchRecommendedPosts: () => Promise<void>;
  fetchTrendingPosts: () => Promise<void>;
  searchPosts: (query: string) => Promise<Post[]>;

  // Follow/Unfollow/Stats
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (targetUserId: string) => Promise<boolean>;
  getUserStats: (username: string) => Promise<UserStats | null>;
  userProfilePosts: Post[];
  fetchUserPosts: (userId: string) => Promise<void>;
  
  clearPosts: () => void;
  clearError: () => void;
}

export const useCommunityStore = create<CommunityStore>()((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,
  hasMore: true,
  page: 1,
  isLoaded: false,
  userProfilePosts: [],

  // ============================================
  // POSTS
  // ============================================
  fetchPosts: async (reset = false, followingOnly = false) => {
    const { isLoading, hasMore } = get();
    if (isLoading) return;
    if (!reset && !hasMore) return;

    const currentPage = reset ? 1 : get().page;
    set({ isLoading: true, error: null });
    
    try {
      const response = await communityService.getPosts(currentPage, 10, followingOnly);
      const rawPosts = response.posts || [];
      const totalPages = response.totalPages || 1;
      const normalizedPosts = rawPosts.map(normalizePost);

      if (reset) {
        set({ 
          posts: normalizedPosts, 
          page: 2, 
          hasMore: currentPage < totalPages, 
          isLoading: false, 
          isLoaded: true,
          error: null,
        });
      } else {
        set((state) => ({ 
          posts: [...state.posts, ...normalizedPosts], 
          page: currentPage + 1, 
          hasMore: currentPage < totalPages, 
          isLoading: false,
        }));
      }
    } catch (error: any) {
      set({ isLoading: false, isLoaded: true, error: error.message });
    }
  },

  fetchPostById: async (postId) => {
    try {
      const post = await communityService.getPostById(postId);
      return post ? normalizePost(post) : null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  addPost: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newPost = await communityService.createPost(data);
      // Refrescar lista completa desde el backend (que ya actualizó Redis)
      await get().fetchPosts(true);
      set({ isLoading: false });
      return newPost ? normalizePost(newPost) : null;
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return null;
    }
  },

  updatePost: async (id, updates) => {
    try {
      const updated = await communityService.updatePost(id, updates);
      if (updated) {
        // Refrescar desde el backend
        await get().fetchPosts(true);
      }
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  deletePost: async (id) => {
    try {
      await communityService.deletePost(id);
      set((state) => ({ 
        posts: state.posts.filter(p => p.id !== id), 
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  likePost: async (postId: string) => {
    // Optimistic update rápido
    set((state) => ({
      posts: state.posts.map(p => {
        if (p.id === postId) {
          const currentUserId = useUserStore.getState().user?.id;
          const isLiked = p.likedBy?.includes(currentUserId || '');
          return {
            ...p,
            likesCount: isLiked ? Math.max(0, (p.likesCount || 1) - 1) : (p.likesCount || 0) + 1,
            likedBy: isLiked 
              ? (p.likedBy || []).filter(id => id !== currentUserId)
              : [...(p.likedBy || []), currentUserId || ''],
          };
        }
        return p;
      })
    }));
    
    try {
      await communityService.likePost(postId);
      // El backend ya invalidó el cache de Redis
    } catch (error) {
      // Rollback: refrescar desde el backend
      await get().fetchPosts(true);
    }
  },

  // ============================================
  // COMMENTS
  // ============================================
  addComment: async (postId, content) => {
    try {
      const newComment = await communityService.addComment(postId, { content });
      // Optimistic update
      if (newComment) {
        set((state) => ({
          posts: state.posts.map(p => 
            p.id === postId 
              ? { 
                  ...p, 
                  comments: [newComment, ...(p.comments || [])], 
                  commentsCount: (p.commentsCount || 0) + 1 
                } 
              : p
          ),
        }));
      }
      return newComment;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  updateComment: async (commentId, content) => {
    try {
      await communityService.updateComment(commentId, { content });
      set((state) => ({
        posts: state.posts.map(p => ({
          ...p,
          comments: updateCommentInTree(p.comments || [], commentId, content),
        })),
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  deleteComment: async (commentId) => {
    try {
      await communityService.deleteComment(commentId);
      set((state) => ({
        posts: state.posts.map(p => ({
          ...p,
          comments: deleteCommentFromTree(p.comments || [], commentId),
          commentsCount: Math.max(0, (p.commentsCount || 1) - 1),
        })),
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  likeComment: async (commentId: string) => {
    try {
      await communityService.likeComment(commentId);
      // El backend ya invalidó el cache de Redis
      // Hacer optimistic update simple
      set((state) => ({
        posts: state.posts.map(p => ({
          ...p,
          comments: toggleCommentLikeLocal(p.comments || [], commentId),
        })),
      }));
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  },

  addReply: async (commentId, content) => {
    set({ isLoading: true, error: null });
    try {
      const newReply = await communityService.addReply(commentId, { content });
      if (newReply) {
        set((state) => ({
          posts: state.posts.map(p => ({ 
            ...p, 
            comments: addReplyToComment(p.comments || [], commentId, newReply) 
          })),
        }));
      }
      return newReply;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  // ============================================
  // FEED
  // ============================================
  fetchPersonalizedFeed: async () => {
    set({ isLoading: true, error: null });
    try {
        const rawPosts = await communityService.getPersonalizedFeed();
        const normalizedPosts = (rawPosts || []).map(normalizePost);
        set({ posts: normalizedPosts, isLoading: false, isLoaded: true, hasMore: false });
    } catch (error: any) {
        set({ isLoading: false, error: error.message });
    }
  },

  recordView: async (postId: string) => {
      try {
          await communityService.recordView(postId);
      } catch (error) {
          console.error('Error recording view:', error);
      }
  },

  // ============================================
  // SEARCH & RECOMMENDATIONS
  // ============================================
  fetchRecommendedPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const rawPosts = await communityService.getRecommendedPosts();
      const normalizedPosts = (rawPosts || []).map(normalizePost);
      set({ posts: normalizedPosts, isLoading: false, isLoaded: true, hasMore: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
    }
  },

  searchPosts: async (query) => {
    try {
      const posts = await communityService.searchPosts(query);
      return (posts || []).map(normalizePost);
    } catch { 
      return []; 
    }
  },
  fetchTrendingPosts: async () => {
    set({ isLoading: true, error: null });
    try {
        const rawPosts = await communityService.getTrendingPosts();
        const normalizedPosts = (rawPosts || []).map(normalizePost);
        set({ posts: normalizedPosts, isLoading: false, isLoaded: true, hasMore: false });
    } catch (error: any) {
        set({ isLoading: false, error: error.message });
    }
  },

  // ============================================
  // FOLLOW / UNFOLLOW / STATS
  // ============================================
  followUser: async (userId: string) => {
    await communityService.followUser(userId);
    // Actualizar estado local
    const { user } = useUserStore.getState();
    if (user) {
      useUserStore.setState({ 
        user: { ...user, following: [...(user.following || []), userId] } 
      });
    }
  },
  
  unfollowUser: async (userId: string) => {
    await communityService.unfollowUser(userId);
    const { user } = useUserStore.getState();
    if (user) {
      useUserStore.setState({ 
        user: { ...user, following: (user.following || []).filter(id => id !== userId) } 
      });
    }
  },
  
  isFollowing: async (targetUserId: string) => {
    const response = await communityService.isFollowing(targetUserId);
    return response.isFollowing;
  },
  
  getUserStats: async (username: string) => {
    return await communityService.getUserStats(username);
  },

  fetchUserPosts: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const rawPosts = await communityService.getUserPosts(userId);
      const normalizedPosts = (rawPosts || []).map(normalizePost);
      set({ 
        userProfilePosts: normalizedPosts, 
        isLoading: false, 
        isLoaded: true 
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
    }
  },


  // ============================================
  // UTILS
  // ============================================
  clearPosts: () => set({ 
    posts: [], page: 1, hasMore: true, isLoaded: false,
  }),
  clearError: () => set({ error: null }),
}));

// ============================================
// HELPERS
// ============================================
function normalizePost(post: any): Post {
  return {
    ...post,
    user: post.user || {
      username: post.username || 'anonymous',
      displayName: post.displayName || post.username || 'Anonymous',
      avatar: post.avatar || '',
    },
    imageUrl: post.imageUrl || null,
    comments: (post.comments || []).map(normalizeComment),
    likedBy: post.likedBy || [],
    tags: post.tags || [],
    likesCount: post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
  };
}

function normalizeComment(comment: any): Comment {
  return {
    ...comment,
    user: comment.user || {
      username: comment.username || 'unknown',
      displayName: comment.displayName || comment.username || 'Unknown',
      avatar: comment.avatar || '',
    },
    replies: (comment.replies || []).map(normalizeComment),
    likedBy: comment.likedBy || [],
    likesCount: comment.likesCount || 0,
    repliesCount: comment.repliesCount || 0,
  };
}

function toggleCommentLikeLocal(comments: Comment[], commentId: string): Comment[] {
  return comments.map(c => {
    if (c.id === commentId) {
      const currentUserId = useUserStore.getState().user?.id;
      const isLiked = c.likedBy?.includes(currentUserId || '');
      return {
        ...c,
        likesCount: isLiked ? Math.max(0, (c.likesCount || 1) - 1) : (c.likesCount || 0) + 1,
        likedBy: isLiked 
          ? (c.likedBy || []).filter(id => id !== currentUserId)
          : [...(c.likedBy || []), currentUserId || ''],
      };
    }
    if (c.replies?.length) return { ...c, replies: toggleCommentLikeLocal(c.replies, commentId) };
    return c;
  });
}

function updateCommentInTree(comments: Comment[], id: string, content: string): Comment[] {
  return comments.map(c => {
    if (c.id === id) return { ...c, content, updatedAt: new Date().toISOString() };
    if (c.replies?.length) return { ...c, replies: updateCommentInTree(c.replies, id, content) };
    return c;
  });
}

function deleteCommentFromTree(comments: Comment[], id: string): Comment[] {
  return comments.filter(c => {
    if (c.id === id) return false;
    if (c.replies?.length) c.replies = deleteCommentFromTree(c.replies, id);
    return true;
  });
}

function addReplyToComment(comments: Comment[], parentId: string, reply: Comment): Comment[] {
  return comments.map(c => {
    if (c.id === parentId) return { ...c, replies: [...(c.replies || []), reply], repliesCount: (c.repliesCount || 0) + 1 };
    if (c.replies?.length) return { ...c, replies: addReplyToComment(c.replies, parentId, reply) };
    return c;
  });
}