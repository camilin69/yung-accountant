// types/post.types.ts
export interface Comment {
  id: string;
  userId: string;
  user: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  content: string;
  likesCount: number;
  likedBy: string[];
  replies: Comment[];
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
}

export interface Post {
  id: string;
  userId: string;
  user: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  title: string;
  content: string;
  likesCount: number;
  likedBy: string[];
  comments: Comment[];
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}