// pages/Profile/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Link as LinkIcon, Calendar, Users, Heart, 
  MessageCircle, Edit2, Mail, ChevronLeft, UserPlus, UserMinus,
  Loader2, AlertCircle 
} from 'lucide-react';
import { useUserStore } from '../../store/user.store';
import { usePostStore } from '../../store/post.store';
import { useThemeStyles } from '../../hooks/useTheme';
import { formatDate } from '../../utils/formatters';
import { PostCard } from '../Community/PostCard';
import { EditProfileModal } from './EditProfileModal';
import ToastNotification from '../../components/common/ToastNotification';
import { ThemeCard } from '../../components/common/ThemeCard';
import { GradientText } from '../../components/common/GradientText';
import { Avatar } from '../../components/common/Avatar';

// Definir el tipo para el perfil de usuario
interface ProfileUserType {
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
  bio?: string;
  location?: string;
  website?: string;
  followers?: string[];
  following?: string[];
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  createdAt?: string;
  updatedAt?: string;
  plan?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  
  const { 
    user: cachedUser,
    isAuthenticated,
    loadUserProfile,
    updateProfile: updateUserProfile,
    followUser, 
    unfollowUser
  } = useUserStore();
  
  const { posts, fetchPosts, isLoading: postsLoading, isLoaded: isPostsLoaded } = usePostStore();
  const { getBadgeClass, getPrimaryButtonClass } = useThemeStyles();
  
  const [profileUser, setProfileUser] = useState<ProfileUserType | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cargar perfil si no existe en caché
  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    
    // Si ya tenemos usuario en caché, usarlo
    if (cachedUser) {
      setProfileUser({
        ...cachedUser,
        followersCount: cachedUser.followers?.length || 0,
        followingCount: cachedUser.following?.length || 0,
      } as ProfileUserType);
      setIsInitialLoad(false);
      return;
    }
    
    // Si no hay usuario en caché, cargarlo
    setIsRefreshing(true);
    try {
      const user = await loadUserProfile(true);
      if (user) {
        setProfileUser({
          ...user,
          followersCount: user.followers?.length || 0,
          followingCount: user.following?.length || 0,
        } as ProfileUserType);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setToastMessage('Error al cargar el perfil');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsInitialLoad(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated, cachedUser, loadUserProfile]);

  // Cargar posts (con manejo de error silencioso)
  const loadPosts = useCallback(async () => {
    // Solo cargar si no están cargados y no está en proceso de carga
    if (!isPostsLoaded && !postsLoading) {
      try {
        await fetchPosts();
      } catch (error) {
        console.error('Error loading posts:', error);
      }
    }
  }, [isPostsLoaded, postsLoading, fetchPosts]);

  // Inicializar datos
  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadPosts();
    }
  }, [isAuthenticated, loadProfile, loadPosts]);

  // Refrescar perfil cuando se actualice el caché
  useEffect(() => {
    if (cachedUser && !isInitialLoad) {
      setProfileUser({
        ...cachedUser,
        followersCount: cachedUser.followers?.length || 0,
        followingCount: cachedUser.following?.length || 0,
      } as ProfileUserType);
    }
  }, [cachedUser, isInitialLoad]);

  const handleFollow = async () => {
    if (!profileUser) return;
    
    try {
      if (profileUser.isFollowing) {
        await unfollowUser(profileUser.id);
        setToastMessage(`Dejaste de seguir a ${profileUser.displayName || profileUser.firstName}`);
        setProfileUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            isFollowing: false,
            followersCount: (prev.followersCount || 1) - 1
          };
        });
      } else {
        await followUser(profileUser.id);
        setToastMessage(`Ahora sigues a ${profileUser.displayName || profileUser.firstName}`);
        setProfileUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            isFollowing: true,
            followersCount: (prev.followersCount || 0) + 1
          };
        });
      }
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      setToastMessage('Error al actualizar el seguimiento');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleProfileUpdate = async () => {
    // Recargar perfil después de actualizar
    setIsRefreshing(true);
    try {
      const updatedUser = await loadUserProfile(true);
      if (updatedUser) {
        setProfileUser({
          ...updatedUser,
          followersCount: updatedUser.followers?.length || 0,
          followingCount: updatedUser.following?.length || 0,
        } as ProfileUserType);
      }
      setToastMessage('Perfil actualizado correctamente');
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      setToastMessage('Error al actualizar el perfil');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtrar posts del usuario
  const userPosts = posts.filter(post => post.userId === profileUser?.id);
  const likedPosts = posts.filter(post => post.likedBy?.includes(profileUser?.id || ''));

  // Loading state
  if (isInitialLoad || (isRefreshing && !profileUser)) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-[var(--theme-primary)] animate-spin" />
          <p className="text-[var(--theme-text-tertiary)] text-sm font-light">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profileUser && !isInitialLoad) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <p className="text-[var(--theme-text-tertiary)] text-sm font-light">No se pudo cargar el perfil</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] rounded-lg text-sm hover:bg-[var(--theme-primary)]/30 transition-colors"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Botón de retroceso */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors text-sm font-light"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver
      </button>

      {/* Tarjeta de perfil */}
      <ThemeCard className="overflow-hidden">
        {/* Imagen de portada */}
        <div className={`h-32 bg-gradient-to-r from-[var(--theme-primary)]/20 to-[var(--theme-secondary)]/20`} />
        
        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="absolute -top-12 left-6">
            <Avatar user={profileUser} size="xl" className="border-4 border-[var(--theme-background-primary)]/20" />
          </div>

          {/* Botón de edición */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleEditProfile}
              className="px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light flex items-center gap-2 transition-colors border border-[var(--theme-border-light)]"
            >
              <Edit2 className="w-4 h-4" />
              Editar Perfil
            </button>
          </div>

          {/* Información del usuario */}
          <div className="mt-12">
            <GradientText as="h1" className="text-2xl font-light">
              {profileUser.displayName || `${profileUser.firstName} ${profileUser.lastName}`}
            </GradientText>
            <p className="text-sm text-[var(--theme-text-tertiary)] mt-1">
              @{profileUser.username || profileUser.email?.split('@')[0]}
            </p>
            
            {profileUser.bio && (
              <p className="text-sm text-[var(--theme-text-secondary)] mt-3 max-w-lg">{profileUser.bio}</p>
            )}

            {/* Metadatos */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-[var(--theme-text-tertiary)]">
              {profileUser.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profileUser.location}</span>
                </div>
              )}
              {profileUser.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <a 
                    href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-[var(--theme-primary)] transition-colors"
                  >
                    {profileUser.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {profileUser.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profileUser.email}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Se unió {formatDate(profileUser.createdAt || new Date().toISOString(), 'short')}</span>
              </div>
            </div>

            {/* Insignia de rol */}
            {profileUser.role && (
              <div className="mt-3">
                <span className={`text-xs px-2 py-1 rounded-full ${getBadgeClass('info')}`}>
                  {profileUser.role.charAt(0).toUpperCase() + profileUser.role.slice(1).replace('-', ' ')}
                </span>
              </div>
            )}

            {/* Plan badge */}
            {profileUser.plan && (
              <div className="mt-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  profileUser.plan === 'premium' 
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/30'
                    : profileUser.plan === 'business'
                    ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {profileUser.plan.charAt(0).toUpperCase() + profileUser.plan.slice(1)} Plan
                </span>
              </div>
            )}

            {/* Estadísticas */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-[var(--theme-border-light)]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-light text-[var(--theme-text-primary)]">{profileUser.followersCount || 0}</span>
                <span className="text-xs text-[var(--theme-text-tertiary)]">Seguidores</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-light text-[var(--theme-text-primary)]">{profileUser.followingCount || 0}</span>
                <span className="text-xs text-[var(--theme-text-tertiary)]">Siguiendo</span>
              </div>
            </div>
          </div>
        </div>
      </ThemeCard>

      {/* Pestañas */}
      <div className="flex gap-4 mt-6 border-b border-[var(--theme-border-light)]">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 text-sm font-light transition-colors relative ${
            activeTab === 'posts'
              ? 'text-[var(--theme-primary)]'
              : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'
          }`}
        >
          Publicaciones ({userPosts.length})
          {activeTab === 'posts' && (
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]`} />
          )}
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`px-4 py-2 text-sm font-light transition-colors relative ${
            activeTab === 'likes'
              ? 'text-[var(--theme-primary)]'
              : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'
          }`}
        >
          Me gusta ({likedPosts.length})
          {activeTab === 'likes' && (
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]`} />
          )}
        </button>
      </div>

      {/* Contenido */}
      <div className="mt-6 space-y-4">
        {activeTab === 'posts' && userPosts.length > 0 ? (
          userPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onUserClick={(id) => navigate(`/profile/${id}`)}
            />
          ))
        ) : activeTab === 'posts' && userPosts.length === 0 ? (
          <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-12 text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[var(--theme-text-tertiary)]" />
            <p className="text-[var(--theme-text-tertiary)] text-sm font-light">No tienes publicaciones aún</p>
            <button 
              onClick={() => navigate('/community')}
              className="mt-4 px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light border border-[var(--theme-border-light)] transition-colors"
            >
              Crear mi primera publicación
            </button>
          </div>
        ) : null}

        {activeTab === 'likes' && likedPosts.length > 0 ? (
          likedPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onUserClick={(id) => navigate(`/profile/${id}`)}
            />
          ))
        ) : activeTab === 'likes' && likedPosts.length === 0 ? (
          <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-12 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-[var(--theme-text-tertiary)]" />
            <p className="text-[var(--theme-text-tertiary)] text-sm font-light">No te ha gustado ninguna publicación aún</p>
          </div>
        ) : null}
      </div>

      {/* Modal de edición */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleProfileUpdate}
      />

      {/* Notificaciones */}
      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default Profile;