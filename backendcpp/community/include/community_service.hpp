// community_service.hpp
#pragma once

#include <string>
#include <vector>
#include <optional>
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
    
    // Posts CRUD
    std::vector<Post> getPosts(const std::string& userId, int page = 1, int limit = 10);
    std::optional<Post> getPostById(const std::string& id);
    std::optional<Post> createPost(const Post& post);
    bool updatePost(const std::string& id, const std::string& userId, const boost::json::object& updates);
    bool deletePost(const std::string& id, const std::string& userId);
    
    // Likes
    bool toggleLikePost(const std::string& postId, const std::string& userId);
    
    // Comments CRUD
    std::vector<Comment> getComments(const std::string& postId);
    std::optional<Comment> addComment(const Comment& comment);
    bool updateComment(const std::string& commentId, const std::string& userId, const boost::json::object& updates);
    bool deleteComment(const std::string& commentId, const std::string& userId);
    bool toggleLikeComment(const std::string& commentId, const std::string& userId);
    
    // Replies
    std::optional<Comment> addReply(const Comment& reply);
    
    // Búsqueda
    std::vector<Post> searchPosts(const std::string& query, const std::string& userId, int page = 1, int limit = 10);
    std::vector<UserSearchResult> searchUsers(const std::string& query, int page = 1, int limit = 10);
    std::vector<UserSearchResult> getRecommendedUsers(int limit = 10);
    std::vector<UserSearchResult> getTrendingUsers(int limit = 10);
    std::vector<UserSearchResult> parseUserSearchResultsFromJson(const std::string& json);
    std::vector<Post> getRecommendedPosts(const std::string& userId, int limit = 10);
    std::vector<Post> getPostsByTag(const std::string& tag, int page = 1, int limit = 10);

    // Follow/Unfollow
    bool followUser(const std::string& followerId, const std::string& targetUserId);
    bool unfollowUser(const std::string& followerId, const std::string& targetUserId);
    bool isFollowing(const std::string& followerId, const std::string& targetUserId);
    boost::json::object getUserStats(const std::string& username);

    // Embeddings
    std::vector<float> generateEmbedding(const std::string& text);
    
    // Cache management
    void invalidateCache(const std::string& key);
    void invalidatePostCache(const std::string& postId);
    void invalidatePostsListCache();
    void updatePostCounter(const std::string& postId, const std::string& field, int delta);
    std::optional<Post> getCachedPost(const std::string& postId);
    void cachePost(const std::string& postId, const Post& post);
    std::optional<std::vector<Post>> getCachedPostsList(int page, int limit);
    void cachePostsList(int page, int limit, const std::vector<Post>& posts);
    
private:
    CommunityService() = default;
    
    Post rowToPost(const pqxx::row& row);
    Comment rowToComment(const pqxx::row& row);
    UserSearchResult rowToUserSearchResult(const pqxx::row& row);
    
    std::string postToJson(const Post& p);
    Post jsonToPost(const std::string& json);
    std::string postsToJson(const std::vector<Post>& posts);
    std::vector<Post> jsonToPosts(const std::string& json);
    std::string commentToJson(const Comment& c);
    Comment jsonToComment(const std::string& json);
    std::string commentsToJson(const std::vector<Comment>& comments);
    std::vector<Comment> jsonToComments(const std::string& json);
    std::string userSearchResultToJson(const UserSearchResult& u);
    std::string userSearchResultsToJson(const std::vector<UserSearchResult>& users);

    std::string uploadImageToCloudinary(const std::string& base64Image, const std::string& folder);
    void deleteCloudinaryImage(const std::string& imageUrl);
};