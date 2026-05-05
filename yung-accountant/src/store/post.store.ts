// store/post.store.ts
import { create } from 'zustand';
import type { Post, Comment } from '../types';
import { postsAxios } from '../services/api/axios.config';
import { ENDPOINTS } from '../services/api/endpoints';

interface PostStore {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  isLoaded: boolean;
  
  // Acciones
  setPosts: (posts: Post[]) => void;
  fetchPosts: (reset?: boolean) => Promise<void>;
  fetchPostById: (postId: string) => Promise<Post | null>;
  addPost: (post: Omit<Post, 'id' | 'userId' | 'user' | 'likesCount' | 'likedBy' | 'comments' | 'createdAt' | 'tags'> & { tags?: string[] }) => Promise<void>;
  updatePost: (id: string, updates: Partial<Post>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  addReply: (postId: string, parentCommentId: string, content: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  likeComment: (postId: string, commentId: string) => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearPosts: () => void;
}

export const usePostStore = create<PostStore>()(
  (set, get) => ({
    posts: [],
    isLoading: false,
    error: null,
    hasMore: true,
    page: 1,
    isLoaded: false,
    
    setPosts: (posts) => set({ posts }),
    
    setLoading: (isLoading) => set({ isLoading }),
    
    setError: (error) => set({ error }),
    
    clearPosts: () => set({ posts: [], page: 1, hasMore: true, isLoaded: false }),
    
    fetchPosts: async (reset = false) => {
      const { isLoading, page, hasMore, posts, isLoaded } = get();
      
      // Si ya tenemos posts cargados y no se fuerza reset, no cargar de nuevo
      if (isLoaded && posts.length > 0 && !reset) {
        return;
      }
      
      if (isLoading) return;
      if (!hasMore && !reset) return;
      
      set({ isLoading: true, error: null });
      
      try {
        const currentPage = reset ? 1 : page;
        const response = await postsAxios.get(ENDPOINTS.POSTS.BASE, {
          params: { page: currentPage, limit: 10 },
          timeout: 5000
        });
        
        const newPosts = response.data.posts || response.data || [];
        const totalPages = response.data.totalPages || 1;
        
        if (reset) {
          set({ 
            posts: newPosts, 
            page: currentPage + 1,
            hasMore: currentPage < totalPages,
            isLoading: false,
            isLoaded: true
          });
        } else {
          set({ 
            posts: [...posts, ...newPosts],
            page: currentPage + 1,
            hasMore: currentPage < totalPages,
            isLoading: false,
            isLoaded: true
          });
        }
      } catch (error: any) {
        console.error('Error fetching posts:', error);
        // No mostrar error al usuario, solo log
        set({ 
          isLoading: false,
          isLoaded: true,
          posts: [] // Inicializar con array vacío para evitar reintentos
        });
      }
    },
    
    fetchPostById: async (postId: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await postsAxios.get(ENDPOINTS.POSTS.BY_ID(postId));
        return response.data;
      } catch (error: any) {
        console.error('Error fetching post:', error);
        set({ error: error.response?.data?.error || error.message || 'Error al cargar el post' });
        return null;
      } finally {
        set({ isLoading: false });
      }
    },
    
    addPost: async (post) => {
      set({ isLoading: true, error: null });
      try {
        const response = await postsAxios.post(ENDPOINTS.POSTS.BASE, {
          title: post.title,
          content: post.content,
          tags: post.tags || []
        });
        
        const newPost = response.data;
        set((state) => ({ 
          posts: [newPost, ...state.posts],
          isLoading: false 
        }));
      } catch (error: any) {
        console.error('Error adding post:', error);
        set({ 
          error: error.response?.data?.error || error.message || 'Error al crear el post',
          isLoading: false 
        });
        throw error;
      }
    },
    
    updatePost: async (id, updates) => {
      set({ isLoading: true, error: null });
      try {
        const response = await postsAxios.put(ENDPOINTS.POSTS.BY_ID(id), updates);
        const updatedPost = response.data;
        
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === id ? updatedPost : p
          ),
          isLoading: false
        }));
      } catch (error: any) {
        console.error('Error updating post:', error);
        set({ 
          error: error.response?.data?.error || error.message || 'Error al actualizar el post',
          isLoading: false 
        });
        throw error;
      }
    },
    
    deletePost: async (id) => {
      set({ isLoading: true, error: null });
      try {
        await postsAxios.delete(ENDPOINTS.POSTS.BY_ID(id));
        
        set((state) => ({
          posts: state.posts.filter((p) => p.id !== id),
          isLoading: false
        }));
      } catch (error: any) {
        console.error('Error deleting post:', error);
        set({ 
          error: error.response?.data?.error || error.message || 'Error al eliminar el post',
          isLoading: false 
        });
        throw error;
      }
    },
    
    likePost: async (postId) => {
      try {
        const response = await postsAxios.post(ENDPOINTS.POSTS.LIKE(postId));
        const { liked, likesCount } = response.data;
        
        set((state) => ({
          posts: state.posts.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                likesCount,
                likedBy: liked 
                  ? [...(p.likedBy || []), 'current-user']
                  : (p.likedBy || []).filter(id => id !== 'current-user')
              };
            }
            return p;
          })
        }));
      } catch (error: any) {
        console.error('Error toggling like:', error);
      }
    },
    
    addComment: async (postId, content) => {
      set({ isLoading: true, error: null });
      try {
        const response = await postsAxios.post(ENDPOINTS.POSTS.COMMENTS(postId), { content });
        const newComment = response.data;
        
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? { ...p, comments: [...p.comments, newComment] }
              : p
          ),
          isLoading: false
        }));
      } catch (error: any) {
        console.error('Error adding comment:', error);
        set({ 
          error: error.response?.data?.error || error.message || 'Error al agregar comentario',
          isLoading: false 
        });
        throw error;
      }
    },
    
    addReply: async (postId, parentCommentId, content) => {
      set({ isLoading: true, error: null });
      try {
        const response = await postsAxios.post(
          ENDPOINTS.POSTS.REPLY(postId, parentCommentId),
          { content }
        );
        const newReply = response.data;
        
        const addReplyToComment = (comments: Comment[]): Comment[] => {
          return comments.map((c) => {
            if (c.id === parentCommentId) {
              return { ...c, replies: [...c.replies, newReply] };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: addReplyToComment(c.replies) };
            }
            return c;
          });
        };

        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? { ...p, comments: addReplyToComment(p.comments) }
              : p
          ),
          isLoading: false
        }));
      } catch (error: any) {
        console.error('Error adding reply:', error);
        set({ 
          error: error.response?.data?.error || error.message || 'Error al agregar respuesta',
          isLoading: false 
        });
        throw error;
      }
    },
    
    deleteComment: async (postId, commentId) => {
      set({ isLoading: true, error: null });
      try {
        await postsAxios.delete(ENDPOINTS.POSTS.COMMENT_BY_ID(postId, commentId));
        
        const deleteCommentById = (comments: Comment[]): Comment[] => {
          return comments.filter((c) => {
            if (c.id === commentId) return false;
            if (c.replies && c.replies.length > 0) {
              c.replies = deleteCommentById(c.replies);
            }
            return true;
          });
        };

        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? { ...p, comments: deleteCommentById(p.comments) }
              : p
          ),
          isLoading: false
        }));
      } catch (error: any) {
        console.error('Error deleting comment:', error);
        set({ 
          error: error.response?.data?.error || error.message || 'Error al eliminar comentario',
          isLoading: false 
        });
        throw error;
      }
    },
    
    likeComment: async (postId, commentId) => {
      try {
        const response = await postsAxios.post(ENDPOINTS.POSTS.LIKE_COMMENT(postId, commentId));
        const { liked, likesCount } = response.data;
        
        const updateCommentLike = (comments: Comment[]): Comment[] => {
          return comments.map((c) => {
            if (c.id === commentId) {
              return {
                ...c,
                likesCount,
                likedBy: liked 
                  ? [...(c.likedBy || []), 'current-user']
                  : (c.likedBy || []).filter(id => id !== 'current-user')
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateCommentLike(c.replies) };
            }
            return c;
          });
        };

        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? { ...p, comments: updateCommentLike(p.comments) }
              : p
          )
        }));
      } catch (error: any) {
        console.error('Error toggling comment like:', error);
      }
    },
  })
);