// store/post.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Post, Comment } from '../types';
import { useUserStore } from './user.store';

const generateId = () => Date.now().toString();

interface PostStore {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  addPost: (post: Omit<Post, 'id' | 'userId' | 'user' | 'likesCount' | 'likedBy' | 'comments' | 'createdAt'>) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  likePost: (postId: string, userId: string) => void;
  addComment: (postId: string, comment: Omit<Comment, 'id' | 'userId' | 'user' | 'likesCount' | 'likedBy' | 'replies' | 'createdAt'>) => void;
  addReply: (postId: string, parentCommentId: string, reply: Omit<Comment, 'id' | 'userId' | 'user' | 'likesCount' | 'likedBy' | 'replies' | 'createdAt'>) => void;
  deleteComment: (postId: string, commentId: string) => void;
  likeComment: (postId: string, commentId: string, userId: string) => void;
}

export const usePostStore = create<PostStore>()(
  persist(
    (set, _get) => ({
      posts: [],
      
      setPosts: (posts) => set({ posts }),
      
      addPost: (post) => {
        const { user } = useUserStore.getState();
        const newPost: Post = {
          ...post,
          id: generateId(),
          userId: user?.id || '1',
          user: {
            username: user?.username || 'user',
            displayName: user?.displayName || 'User',
          },
          likesCount: 0,
          likedBy: [],
          comments: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ posts: [newPost, ...state.posts] }));
      },
      
      updatePost: (id, updates) => {
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },
      
      deletePost: (id) => {
        set((state) => ({
          posts: state.posts.filter((p) => p.id !== id),
        }));
      },
      
      likePost: (postId, userId) => {
        set((state) => ({
          posts: state.posts.map((p) => {
            if (p.id === postId) {
              const hasLiked = p.likedBy.includes(userId);
              return {
                ...p,
                likesCount: hasLiked ? p.likesCount - 1 : p.likesCount + 1,
                likedBy: hasLiked ? p.likedBy.filter(id => id !== userId) : [...p.likedBy, userId],
              };
            }
            return p;
          }),
        }));
      },
      
      addComment: (postId, comment) => {
        const { user } = useUserStore.getState();
        const newComment: Comment = {
          id: generateId(),
          userId: user?.id || '1',
          user: {
            username: user?.username || 'user',
            displayName: user?.displayName || 'User',
          },
          content: comment.content,
          likesCount: 0,
          likedBy: [],
          replies: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? { ...p, comments: [...p.comments, newComment] }
              : p
          ),
        }));
      },
      
      addReply: (postId, parentCommentId, reply) => {
        const { user } = useUserStore.getState();
        const newReply: Comment = {
          id: generateId(),
          userId: user?.id || '1',
          user: {
            username: user?.username || 'user',
            displayName: user?.displayName || 'User',
          },
          content: reply.content,
          likesCount: 0,
          likedBy: [],
          replies: [],
          createdAt: new Date().toISOString(),
          parentId: parentCommentId,
        };

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
        }));
      },
      
      deleteComment: (postId, commentId) => {
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
        }));
      },
      
      likeComment: (postId, commentId, userId) => {
        const updateCommentLike = (comments: Comment[]): Comment[] => {
          return comments.map((c) => {
            if (c.id === commentId) {
              const hasLiked = c.likedBy.includes(userId);
              return {
                ...c,
                likesCount: hasLiked ? c.likesCount - 1 : c.likesCount + 1,
                likedBy: hasLiked ? c.likedBy.filter(id => id !== userId) : [...c.likedBy, userId],
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
          ),
        }));
      },
    }),
    { name: 'yung-accountant-posts' }
  )
);