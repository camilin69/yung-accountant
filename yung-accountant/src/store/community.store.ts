// store/community.store.ts - Versión optimizada con optimistic updates
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
  
  // Cache local para likes
  likedPosts: Set<string>;
  likedComments: Set<string>;
  postLikesCount: Map<string, number>;
  commentLikesCount: Map<string, number>;

  fetchPosts: (reset?: boolean) => Promise<void>;
  fetchPostById: (postId: string) => Promise<Post | null>;
  addPost: (data: { title: string; content: string; tags?: string[]; imageUrl?: string }) => Promise<Post | null>;
  updatePost: (id: string, updates: { title?: string; content?: string; tags?: string[]; imageUrl?: string }) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;
  likePost: (postId: string) => Promise<void>;
  
  addComment: (postId: string, content: string) => Promise<Comment | null>;
  updateComment: (commentId: string, content: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  likeComment: (commentId: string) => Promise<void>;
  addReply: (commentId: string, content: string) => Promise<Comment | null>;
  
  fetchRecommendedPosts: () => Promise<void>;
  searchPosts: (query: string) => Promise<Post[]>;

  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (targetUserId: string) => Promise<boolean>;
  getUserStats: (username: string) => Promise<UserStats | null>;
  
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
  
  // Inicializar caches locales
  likedPosts: new Set<string>(),
  likedComments: new Set<string>(),
  postLikesCount: new Map<string, number>(),
  commentLikesCount: new Map<string, number>(),

  fetchPosts: async (reset = false) => {
    const { isLoading, hasMore } = get();
    if (isLoading) return;
    if (!reset && !hasMore) return;

    const currentPage = reset ? 1 : get().page;
    set({ isLoading: true, error: null });
    
    try {
        const response = await communityService.getPosts(currentPage, 10);
        const rawPosts = response.posts || [];
        const totalPages = response.totalPages || 1;
        
        const normalizedPosts = rawPosts.map(normalizePost);
        
        // Reconstruir likedPosts desde los datos del servidor
        const likedPosts = new Set(get().likedPosts);
        const postLikesCount = new Map(get().postLikesCount);
        const currentUserId = useUserStore.getState().user?.id;
        
        normalizedPosts.forEach(post => {
            postLikesCount.set(post.id, post.likesCount || 0);
            
            // Si el post tiene 'me' en likedBy, el usuario actual dio like
            if (currentUserId && post.likedBy?.includes(currentUserId)) {
                likedPosts.add(post.id);
            }
        });

        if (reset) {
            set({ 
                posts: normalizedPosts, 
                page: 2, 
                hasMore: currentPage < totalPages, 
                isLoading: false, 
                isLoaded: true,
                error: null,
                likedPosts,
                postLikesCount
            });
        } else {
            set((state) => ({ 
                posts: [...state.posts, ...normalizedPosts], 
                page: currentPage + 1, 
                hasMore: currentPage < totalPages, 
                isLoading: false,
                likedPosts,
                postLikesCount
            }));
        }
    } catch (error: any) {
        set({ isLoading: false, isLoaded: true, error: error.message });
    }
  },


  // Optimistic update para likes
  likePost: async (postId: string) => {
    const { likedPosts, posts } = get();
    const isCurrentlyLiked = likedPosts.has(postId);
    
    // Optimistic update - actualizar UI inmediatamente
    const newLikedPosts = new Set(likedPosts);
    
    if (isCurrentlyLiked) {
      newLikedPosts.delete(postId);
    } else {
      newLikedPosts.add(postId);
    }
    
    // Actualizar el contador local
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likesCount: isCurrentlyLiked 
            ? Math.max(0, (post.likesCount || 1) - 1) 
            : (post.likesCount || 0) + 1,
          likedBy: isCurrentlyLiked
            ? (post.likedBy || []).filter(id => id !== 'me')
            : [...(post.likedBy || []), 'me']
        };
      }
      return post;
    });
    
    set({ 
      posts: updatedPosts, 
      likedPosts: newLikedPosts 
    });
    
    // Llamar al backend en segundo plano (sin esperar)
    try {
      await communityService.likePost(postId);
      // No necesitamos hacer nada más, el optimistic update ya se aplicó
    } catch (error) {
      console.error('Error liking post, rolling back:', error);
      // Rollback si falla
      set({ 
        posts: posts, // Volver al estado anterior
        likedPosts: likedPosts 
      });
    }
  },

  // Optimistic update para likes de comentarios
  likeComment: async (commentId: string) => {
    const { likedComments, posts } = get();
    const isCurrentlyLiked = likedComments.has(commentId);
    
    // Optimistic update
    const newLikedComments = new Set(likedComments);
    if (isCurrentlyLiked) {
      newLikedComments.delete(commentId);
    } else {
      newLikedComments.add(commentId);
    }
    
    const updatedPosts = posts.map(post => ({
      ...post,
      comments: toggleCommentLikeOptimistic(
        post.comments, 
        commentId, 
        isCurrentlyLiked
      )
    }));
    
    set({ posts: updatedPosts, likedComments: newLikedComments });
    
    // Llamar al backend en segundo plano
    try {
      await communityService.likeComment(commentId);
    } catch (error) {
      console.error('Error liking comment, rolling back:', error);
      set({ posts: posts, likedComments: likedComments });
    }
  },

  addComment: async (postId, content) => {
    set({ isLoading: true, error: null });
    try {
      const newComment = await communityService.addComment(postId, { content });
      
      // Optimistic update para comentarios
      set((state) => ({
        posts: state.posts.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                comments: [newComment, ...p.comments], 
                commentsCount: (p.commentsCount || 0) + 1 
              } 
            : p
        ),
        isLoading: false,
      }));
      return newComment;
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return null;
    }
  },

  // ... (resto de métodos se mantienen igual)
  fetchPostById: async (postId) => {
    set({ isLoading: true });
    try {
      const post = await communityService.getPostById(postId);
      set({ isLoading: false });
      return post ? normalizePost(post) : null;
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return null;
    }
  },

  addPost: async (data: { title: string; content: string; tags?: string[]; imageUrl?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const newPost = await communityService.createPost(data);
      const normalized = normalizePost(newPost);
      set((state) => ({ posts: [normalized, ...state.posts], isLoading: false }));
      const { fetchPosts } = useCommunityStore.getState();
      await fetchPosts(true);
      return normalized;
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return null;
    }
  },

  updatePost: async (id, updates: { title?: string; content?: string; tags?: string[]; imageUrl?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await communityService.updatePost(id, updates);
      const normalized = normalizePost(updated);
      set((state) => ({ posts: state.posts.map(p => p.id === id ? normalized : p), isLoading: false }));
      const { fetchPosts } = useCommunityStore.getState();
      await fetchPosts(true);
      return true;
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return false;
    }
  },

  deletePost: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await communityService.deletePost(id);
      set((state) => ({ 
        posts: state.posts.filter(p => p.id !== id), 
        isLoading: false 
      }));
      return true;
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return false;
    }
  },

  updateComment: async (commentId, content) => {
    set({ isLoading: true, error: null });
    try {
      await communityService.updateComment(commentId, { content });
      set((state) => ({
        posts: state.posts.map(p => ({
          ...p,
          comments: updateCommentInTree(p.comments, commentId, content),
        })),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return false;
    }
  },

  deleteComment: async (commentId) => {
    set({ isLoading: true, error: null });
    try {
      await communityService.deleteComment(commentId);
      set((state) => ({
        posts: state.posts.map(p => ({
          ...p,
          comments: deleteCommentFromTree(p.comments, commentId),
          commentsCount: Math.max(0, (p.commentsCount || 1) - 1),
        })),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return false;
    }
  },

  addReply: async (commentId, content) => {
    set({ isLoading: true, error: null });
    try {
      const newReply = await communityService.addReply(commentId, { content });
      set((state) => ({
        posts: state.posts.map(p => ({ 
          ...p, 
          comments: addReplyToComment(p.comments, commentId, newReply) 
        })),
        isLoading: false,
      }));
      return newReply;
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return null;
    }
  },

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

  followUser: async (userId: string) => {
    try {
      await communityService.followUser(userId);
      
      const { user } = useUserStore.getState();
      if (user) {
        const updatedFollowing = [...(user.following || []), userId];
        useUserStore.setState({ user: { ...user, following: updatedFollowing } });
      }
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  },
  
  unfollowUser: async (userId: string) => {
    try {
      await communityService.unfollowUser(userId);
      
      const { user } = useUserStore.getState();
      if (user) {
        const updatedFollowing = (user.following || []).filter(id => id !== userId);
        useUserStore.setState({ user: { ...user, following: updatedFollowing } });
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  },
  
  isFollowing: async (targetUserId: string) => {
    try {
      const response = await communityService.isFollowing(targetUserId);
      return response.isFollowing;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  },
  
  getUserStats: async (username: string) => {
    try {
      return await communityService.getUserStats(username);
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  },


  clearPosts: () => set({ 
    posts: [], 
    page: 1, 
    hasMore: true, 
    isLoaded: false,
    likedPosts: new Set(),
    likedComments: new Set(),
    postLikesCount: new Map(),
    commentLikesCount: new Map()
  }),
  clearError: () => set({ error: null }),
}));

// Función para normalizar posts del backend
function normalizePost(post: any): Post {
  return {
    ...post,
    // Asegurar que user existe con los campos correctos
    user: post.user || {
      username: post.username || 'anonymous',
      displayName: post.displayName || post.username || 'Anonymous',
      avatar: post.avatar || '',
    },
    // Si no hay user pero sí avatar, asegurarlo en user
    ...(post.avatar && !post.user?.avatar ? {
      user: {
        ...(post.user || {}),
        avatar: post.avatar
      }
    } : {}),
    // Asegurar que imageUrl se preserve
    imageUrl: post.imageUrl || null,
    // Asegurar arrays
    comments: (post.comments || []).map(normalizeComment),
    likedBy: post.likedBy || [],
    tags: post.tags || [],
    // Asegurar contadores
    likesCount: post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
  };
}

// También normalizar comentarios para consistencia
function normalizeComment(comment: any): Comment {
  return {
    ...comment,
    user: comment.user || {
      username: comment.username || 'unknown',
      displayName: comment.displayName || comment.username || 'Unknown',
      avatar: comment.avatar || '',
    },
    // Normalizar replies recursivamente
    replies: (comment.replies || []).map(normalizeComment),
    likedBy: comment.likedBy || [],
    likesCount: comment.likesCount || 0,
    repliesCount: comment.repliesCount || 0,
  };
}

// Optimistic like para comentarios
function toggleCommentLikeOptimistic(
  comments: Comment[], 
  commentId: string, 
  isCurrentlyLiked: boolean
): Comment[] {
  return comments.map(c => {
    if (c.id === commentId) {
      return {
        ...c,
        likesCount: isCurrentlyLiked 
          ? Math.max(0, (c.likesCount || 1) - 1) 
          : (c.likesCount || 0) + 1,
        likedBy: isCurrentlyLiked
          ? (c.likedBy || []).filter(id => id !== 'me')
          : [...(c.likedBy || []), 'me']
      };
    }
    if (c.replies?.length) {
      return { ...c, replies: toggleCommentLikeOptimistic(c.replies, commentId, isCurrentlyLiked) };
    }
    return c;
  });
}

// Helpers existentes...
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