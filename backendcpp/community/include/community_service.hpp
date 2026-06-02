// community_service.hpp
#pragma once

#include <string>
#include <vector>
#include <optional>
#include <memory>
#include <shared_mutex>
#include <boost/json.hpp>
#include <pqxx/pqxx>

struct Post {
    std::string id;
    std::string userId;
    std::string title;
    std::string content;
    std::string imageUrl;
    std::vector<std::string> tags;
    int likesCount;
    std::vector<std::string> likedBy;
    std::string username;
    std::string displayName;
    std::string avatar;
    int commentsCount;
    std::string createdAt;
    std::string updatedAt;
    std::vector<float> embedding;
    double searchRank = 0.0;
};

struct Comment {
    std::string id;
    std::string postId;
    std::string userId;
    std::string parentId;
    std::string content;
    int likesCount;
    std::vector<std::string> likedBy;
    std::string username;
    std::string displayName;
    std::string avatar;
    std::vector<Comment> replies;
    int repliesCount;
    std::string createdAt;
    std::string updatedAt;
};

struct UserSearchResult {
    std::string id;
    std::string username;
    std::string displayName;
    std::string avatar;
    std::string bio;
    int followersCount;
    int postsCount;
};

class CommunityService {
public:
    static CommunityService& getInstance();
    
    // ============================================
    // POSTS CRUD
    // ============================================
    std::vector<Post> getPosts(const std::string& userId, int page = 1, int limit = 10, bool followingOnly = false);
    std::optional<Post> getPostById(const std::string& id);
    std::optional<Post> createPost(const Post& post);
    bool updatePost(const std::string& id, const std::string& userId, const boost::json::object& updates);
    bool deletePost(const std::string& id, const std::string& userId);
    
    // ============================================
    // LIKES
    // ============================================
    bool toggleLikePost(const std::string& postId, const std::string& userId);
    
    // ============================================
    // COMMENTS CRUD
    // ============================================
    std::vector<Comment> getComments(const std::string& postId);
    std::vector<Comment> getReplies(const std::string& parentId);
    std::optional<Comment> addComment(const Comment& comment);
    bool updateComment(const std::string& commentId, const std::string& userId, const boost::json::object& updates);
    bool deleteComment(const std::string& commentId, const std::string& userId);
    bool toggleLikeComment(const std::string& commentId, const std::string& userId);
    
    // ============================================
    // REPLIES
    // ============================================
    std::optional<Comment> addReply(const Comment& reply);
    
    // ============================================
    // SEARCH & RECOMMENDATIONS
    // ============================================
    std::vector<Post> searchPosts(const std::string& query, const std::string& userId, int page = 1, int limit = 10);
    std::vector<UserSearchResult> searchUsers(const std::string& query, int page = 1, int limit = 10, const std::string& currentUserId = "");
    std::vector<UserSearchResult> getRecommendedUsers(int limit = 10, const std::string& currentUserId = "");
    std::vector<UserSearchResult> getTrendingUsers(int limit = 10);
    std::vector<Post> getTrendingPosts(int limit = 10);
    std::vector<UserSearchResult> parseUserSearchResultsFromJson(const std::string& json);
    std::vector<Post> getRecommendedPosts(const std::string& userId, int limit = 10);
    std::vector<Post> getPostsByTag(const std::string& tag, int page = 1, int limit = 10);

    // ============================================
    // FOLLOW / UNFOLLOW / STATS
    // ============================================
    bool followUser(const std::string& followerId, const std::string& targetUserId);
    bool unfollowUser(const std::string& followerId, const std::string& targetUserId);
    bool isFollowing(const std::string& followerId, const std::string& targetUserId);
    boost::json::object getUserStats(const std::string& username);
    std::vector<Post> getPostsByUser(const std::string& userId);

    // ============================================
    // EMBEDDINGS
    // ============================================
    std::vector<float> generateEmbedding(const std::string& text);
    
    // ============================================
    // FEED
    // ============================================
    std::vector<Post> getPersonalizedFeed(const std::string& userId, int limit = 10);
    void recordInteraction(const std::string& userId, const std::string& postId, 
                                          bool liked, bool commented);
    void recordView(const std::string& userId, const std::string& postId);
    
    
    std::string postsToJson(const std::vector<Post>& posts);
    std::string commentsToJson(const std::vector<Comment>& comments);
private:
    CommunityService() = default;
    
    mutable std::shared_mutex cache_mutex_;
    // Row mappers
    Post rowToPost(const pqxx::row& row);
    Comment rowToComment(const pqxx::row& row);
    UserSearchResult rowToUserSearchResult(const pqxx::row& row);

    // Versiones internas que reutilizan conexión (evitan PoolConnection anidado)
    std::vector<Comment> getRepliesWithConn(pqxx::connection& conn, const std::string& parentId);
    std::vector<UserSearchResult> getRecommendedUsersWithConn(pqxx::connection& conn, int limit, const std::string& currentUserId);
    std::vector<Post> getTrendingPostsWithConn(pqxx::connection& conn, int limit);
    std::vector<UserSearchResult> getTrendingUsersWithConn(pqxx::connection& conn, int limit);
    
    // Serialization
    std::string postToJson(const Post& p);
    Post jsonToPost(const std::string& json);
    std::vector<Post> jsonToPosts(const std::string& json);
    std::string commentToJson(const Comment& c);
    Comment jsonToComment(const std::string& json);
    std::vector<Comment> jsonToComments(const std::string& json);
    std::string userSearchResultToJson(const UserSearchResult& u);
    std::string userSearchResultsToJson(const std::vector<UserSearchResult>& users);

    // Métodos de caché thread-safe
    std::optional<std::vector<Post>> getCachedPostsList(int page, int limit);
    void cachePostsList(int page, int limit, const std::vector<Post>& posts);
    void invalidatePostsListCache();
    void invalidateCommentsCache(const std::string& postId);
    void invalidateSearchCaches();
    void invalidateTrendingCache();
    void invalidatePersonalizedFeedCache(const std::string& userId);
    void invalidateFollowCaches(const std::string& userId);
    void invalidateUserStatsCache();
    void cacheWithTracking(const std::string& key, const std::string& value, 
                       const std::string& setKey, int ttl = 300);
    
    // Cloudinary
    std::string uploadImageToCloudinary(
    const std::string& base64Image, 
    const std::string& folder,
    const std::string& publicId);
    void deleteCloudinaryImage(const std::string& imageUrl);
    std::string generateCloudinarySignature(const std::string& toSign);
    std::string extractPublicIdFromUrl(const std::string& imageUrl);
    std::vector<std::string> parsePostgresArray(const std::string& pgArray);

};