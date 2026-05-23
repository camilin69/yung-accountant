#include "community_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>
#include <sstream>
#include <algorithm>
#include <curl/curl.h>
#include <openssl/sha.h>
#include <iomanip>

class PoolConnection {
public:
    PoolConnection() : conn_(Database::getInstance().acquireConnection()) {}
    ~PoolConnection() { 
        if (conn_) Database::getInstance().releaseConnection(std::move(conn_)); 
    }
    
    pqxx::connection& get() { return *conn_; }
    
    // No copiable
    PoolConnection(const PoolConnection&) = delete;
    PoolConnection& operator=(const PoolConnection&) = delete;
    // Movible
    PoolConnection(PoolConnection&&) = default;

private:
    std::unique_ptr<pqxx::connection> conn_;
};

// ============================================
// SERIALIZACIÓN
// ============================================
std::string CommunityService::postToJson(const Post& p) {
    boost::json::object obj;
    obj["id"] = p.id; obj["userId"] = p.userId;
    obj["title"] = p.title; obj["content"] = p.content;
    boost::json::array tags; for (const auto& t : p.tags) tags.push_back(boost::json::value(t));
    obj["tags"] = tags;
    obj["likesCount"] = p.likesCount;
    boost::json::array likedBy; for (const auto& id : p.likedBy) likedBy.push_back(boost::json::value(id));
    obj["likedBy"] = likedBy;
    obj["username"] = p.username; obj["displayName"] = p.displayName;
    obj["avatar"] = p.avatar.empty() ? nullptr : boost::json::value(p.avatar);
    obj["commentsCount"] = p.commentsCount;
    obj["createdAt"] = p.createdAt; obj["updatedAt"] = p.updatedAt;
    obj["searchRank"] = p.searchRank;
    obj["imageUrl"] = p.imageUrl.empty() ? nullptr : boost::json::value(p.imageUrl);
    return boost::json::serialize(obj);
}

Post CommunityService::jsonToPost(const std::string& json) {
    auto jv = boost::json::parse(json);
    auto& obj = jv.as_object();
    Post p;
    p.id = boost::json::value_to<std::string>(obj.at("id"));
    p.userId = boost::json::value_to<std::string>(obj.at("userId"));
    p.title = boost::json::value_to<std::string>(obj.at("title"));
    p.content = boost::json::value_to<std::string>(obj.at("content"));
    for (const auto& t : obj.at("tags").as_array()) p.tags.push_back(boost::json::value_to<std::string>(t));
    p.likesCount = obj.at("likesCount").as_int64();
    for (const auto& id : obj.at("likedBy").as_array()) p.likedBy.push_back(boost::json::value_to<std::string>(id));
    p.username = boost::json::value_to<std::string>(obj.at("username"));
    p.displayName = boost::json::value_to<std::string>(obj.at("displayName"));
    p.avatar = obj.at("avatar").is_null() ? "" : boost::json::value_to<std::string>(obj.at("avatar"));
    p.commentsCount = obj.at("commentsCount").as_int64();
    p.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    p.updatedAt = boost::json::value_to<std::string>(obj.at("updatedAt"));
    p.searchRank = obj.at("searchRank").as_double();
    p.imageUrl = obj.contains("imageUrl") && !obj.at("imageUrl").is_null() 
        ? boost::json::value_to<std::string>(obj.at("imageUrl")) : "";
    return p;
}

std::string CommunityService::postsToJson(const std::vector<Post>& posts) {
    boost::json::array arr;
    for (const auto& p : posts) arr.push_back(boost::json::parse(postToJson(p)));
    return boost::json::serialize(arr);
}

std::vector<Post> CommunityService::jsonToPosts(const std::string& json) {
    std::vector<Post> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) result.push_back(jsonToPost(boost::json::serialize(item)));
    return result;
}

std::string CommunityService::commentToJson(const Comment& c) {
    boost::json::object obj;
    obj["id"] = c.id; 
    obj["postId"] = c.postId; 
    obj["userId"] = c.userId;
    obj["parentId"] = c.parentId.empty() ? nullptr : boost::json::value(c.parentId);
    obj["content"] = c.content; 
    obj["likesCount"] = c.likesCount;
    
    boost::json::array likedBy; 
    for (const auto& id : c.likedBy) likedBy.push_back(boost::json::value(id));
    obj["likedBy"] = likedBy;
    
    obj["username"] = c.username; 
    obj["displayName"] = c.displayName;
    obj["avatar"] = c.avatar.empty() ? nullptr : boost::json::value(c.avatar);
    obj["repliesCount"] = c.repliesCount;
    obj["createdAt"] = c.createdAt; 
    obj["updatedAt"] = c.updatedAt;
    
    // Incluir replies anidados
    if (!c.replies.empty()) {
        boost::json::array repliesArr;
        for (const auto& r : c.replies) {
            repliesArr.push_back(boost::json::parse(commentToJson(r)));
        }
        obj["replies"] = repliesArr;
    }
    
    return boost::json::serialize(obj);
}

Comment CommunityService::jsonToComment(const std::string& json) {
    auto jv = boost::json::parse(json);
    auto& obj = jv.as_object();
    Comment c;
    c.id = boost::json::value_to<std::string>(obj.at("id"));
    c.postId = boost::json::value_to<std::string>(obj.at("postId"));
    c.userId = boost::json::value_to<std::string>(obj.at("userId"));
    c.parentId = obj.at("parentId").is_null() ? "" : boost::json::value_to<std::string>(obj.at("parentId"));
    c.content = boost::json::value_to<std::string>(obj.at("content"));
    c.likesCount = obj.at("likesCount").as_int64();
    for (const auto& id : obj.at("likedBy").as_array()) c.likedBy.push_back(boost::json::value_to<std::string>(id));
    c.username = boost::json::value_to<std::string>(obj.at("username"));
    c.displayName = boost::json::value_to<std::string>(obj.at("displayName"));
    c.avatar = obj.at("avatar").is_null() ? "" : boost::json::value_to<std::string>(obj.at("avatar"));
    c.repliesCount = obj.at("repliesCount").as_int64();
    c.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    c.updatedAt = boost::json::value_to<std::string>(obj.at("updatedAt"));
    
    // Parsear replies anidados
    if (obj.contains("replies") && !obj.at("replies").is_null()) {
        for (const auto& r : obj.at("replies").as_array()) {
            c.replies.push_back(jsonToComment(boost::json::serialize(r)));
        }
    }
    
    return c;
}

std::string CommunityService::commentsToJson(const std::vector<Comment>& comments) {
    boost::json::array arr;
    for (const auto& c : comments) arr.push_back(boost::json::parse(commentToJson(c)));
    return boost::json::serialize(arr);
}

std::vector<Comment> CommunityService::jsonToComments(const std::string& json) {
    std::vector<Comment> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) result.push_back(jsonToComment(boost::json::serialize(item)));
    return result;
}

// ============================================
// USER SEARCH SERIALIZATION
// ============================================
std::string CommunityService::userSearchResultToJson(const UserSearchResult& u) {
    boost::json::object obj;
    obj["id"] = u.id;
    obj["username"] = u.username;
    obj["displayName"] = u.displayName;
    obj["avatar"] = u.avatar.empty() ? nullptr : boost::json::value(u.avatar);
    obj["bio"] = u.bio.empty() ? nullptr : boost::json::value(u.bio);
    obj["followersCount"] = u.followersCount;
    obj["postsCount"] = u.postsCount;
    return boost::json::serialize(obj);
}

std::string CommunityService::userSearchResultsToJson(const std::vector<UserSearchResult>& users) {
    boost::json::array arr;
    for (const auto& u : users) {
        arr.push_back(boost::json::parse(userSearchResultToJson(u)));
    }
    return boost::json::serialize(arr);
}

// ============================================
// SINGLETON
// ============================================
CommunityService& CommunityService::getInstance() {
    static CommunityService instance;
    return instance;
}

// ============================================
// POSTS CRUD
// ============================================
std::vector<Post> CommunityService::getPosts(const std::string& userId, int page, int limit, bool followingOnly) {
    int offset = (page - 1) * limit;
    
    // No cachear cuando es followingOnly (datos personalizados)
    if (!followingOnly) {
        auto cachedList = getCachedPostsList(page, limit);
        if (cachedList) {
            std::cout << "[Redis] Cache HIT: posts list page " << page << std::endl;
            return *cachedList;
        }
    }
    
    std::vector<Post> posts;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        pqxx::result result;
        
        if (followingOnly && !userId.empty()) {
            // Solo posts de usuarios que sigo
            result = txn.exec_params(
                "SELECT p.*, u.username, u.display_name, u.profile_pic as avatar, "
                "(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count "
                "FROM posts p JOIN users u ON p.user_id = u.id "
                "WHERE p.user_id::text = ANY("
                "  COALESCE((SELECT following FROM users WHERE id = $1::uuid), '{}')"
                ") "
                "ORDER BY p.created_at DESC LIMIT $2 OFFSET $3", 
                userId, limit, offset);
        } else {
            result = txn.exec_params(
                "SELECT p.*, u.username, u.display_name, u.profile_pic as avatar, "
                "(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count "
                "FROM posts p JOIN users u ON p.user_id = u.id "
                "ORDER BY p.created_at DESC LIMIT $1 OFFSET $2", limit, offset);
        }
        txn.commit();
        
        for (const auto& row : result) {
            Post p = rowToPost(row);
            p.username = row["username"].as<std::string>();
            p.displayName = row["display_name"].as<std::string>();
            p.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
            p.commentsCount = row["comments_count"].as<int>();
            posts.push_back(p);
        }
        
        // Solo cachear si no es followingOnly
        if (!followingOnly && !posts.empty()) {
            cachePostsList(page, limit, posts);
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error getting posts: " << e.what() << std::endl;
    }
    return posts;
}



std::optional<Post> CommunityService::getPostById(const std::string& id) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT p.*, u.username, u.display_name, u.profile_pic as avatar, "
            "(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count "
            "FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1", id);
        txn.commit();
        
        if (!result.empty()) {
            Post p = rowToPost(result[0]);
            p.username = result[0]["username"].as<std::string>();
            p.displayName = result[0]["display_name"].as<std::string>();
            p.avatar = result[0]["avatar"].is_null() ? "" : result[0]["avatar"].as<std::string>();
            p.commentsCount = result[0]["comments_count"].as<int>();
            return p;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting post by id: " << e.what() << std::endl;
        return std::nullopt;
    }
}



std::optional<Post> CommunityService::createPost(const Post& post) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        std::string tagsStr = "{";
        for (size_t i = 0; i < post.tags.size(); ++i) {
            if (i > 0) tagsStr += ",";
            tagsStr += "\"" + post.tags[i] + "\"";
        }
        tagsStr += "}";
        
        std::string tagsText;
        for (size_t i = 0; i < post.tags.size(); ++i) {
            if (i > 0) tagsText += " ";
            tagsText += post.tags[i];
        }
        std::string textToEmbed = post.title + " " + post.content + " " + tagsText;
        std::vector<float> embedding = generateEmbedding(textToEmbed);
        
        std::string embeddingStr = "[";
        for (size_t i = 0; i < embedding.size(); ++i) {
            if (i > 0) embeddingStr += ",";
            embeddingStr += std::to_string(embedding[i]);
        }
        embeddingStr += "]";
        
        std::string finalImageUrl;
        if (!post.imageUrl.empty()) {
            if (post.imageUrl.find("data:image") == 0 || post.imageUrl.find("/9j/") == 0 || post.imageUrl.size() > 500) {
                std::cout << "[Image] Uploading base64 image..." << std::endl;
                finalImageUrl = uploadImageToCloudinary(post.imageUrl, "yung-accountant/posts/pictures");
                std::cout << "[Image] Uploaded: " << finalImageUrl << std::endl;
            } else {
                finalImageUrl = post.imageUrl;
            }
        }
        
        bool hasEmbedding = !embedding.empty();
        bool hasImage = !finalImageUrl.empty();
        
        pqxx::result result;
        if (hasEmbedding && hasImage) {
            result = txn.exec_params(
                "INSERT INTO posts (user_id, title, content, tags, embedding, image_url) "
                "VALUES ($1,$2,$3,$4,$5::vector,$6) RETURNING id, created_at, updated_at",
                post.userId, post.title, post.content, tagsStr, embeddingStr, finalImageUrl);
        } else if (hasEmbedding) {
            result = txn.exec_params(
                "INSERT INTO posts (user_id, title, content, tags, embedding) "
                "VALUES ($1,$2,$3,$4,$5::vector) RETURNING id, created_at, updated_at",
                post.userId, post.title, post.content, tagsStr, embeddingStr);
        } else if (hasImage) {
            result = txn.exec_params(
                "INSERT INTO posts (user_id, title, content, tags, image_url) "
                "VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at, updated_at",
                post.userId, post.title, post.content, tagsStr, finalImageUrl);
        } else {
            result = txn.exec_params(
                "INSERT INTO posts (user_id, title, content, tags) VALUES ($1,$2,$3,$4) RETURNING id, created_at, updated_at",
                post.userId, post.title, post.content, tagsStr);
        }
        txn.commit();
        
        if (!result.empty()) {
            Post p = post;
            p.id = result[0]["id"].as<std::string>();
            p.createdAt = result[0]["created_at"].as<std::string>();
            p.updatedAt = result[0]["updated_at"].as<std::string>();
            p.embedding = embedding;
            p.imageUrl = finalImageUrl;
            
            // Invalidar TODAS las listas de posts y búsquedas
            invalidatePostsListCache();
            invalidateSearchCaches();
            
            return p;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error creating post: " << e.what() << std::endl;
        return std::nullopt;
    }
}


bool CommunityService::updatePost(const std::string& id, const std::string& userId, const boost::json::object& updates) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        std::string query = "UPDATE posts SET ";
        std::vector<std::string> parts;
        auto quote = [&](const std::string& s) { return txn.quote(s); };
        
        std::string newTitle, newContent;
        std::vector<std::string> newTags;
        std::string newImageUrl, oldImageUrl;
        bool contentChanged = false;
        bool imageChanged = false;
        
        if (updates.contains("title")) {
            newTitle = std::string(updates.at("title").as_string());
            parts.push_back("title = " + quote(newTitle));
            contentChanged = true;
        }
        if (updates.contains("content")) {
            newContent = std::string(updates.at("content").as_string());
            parts.push_back("content = " + quote(newContent));
            contentChanged = true;
        }
        if (updates.contains("tags")) {
            std::string tagsStr = "{";
            const auto& arr = updates.at("tags").as_array();
            for (size_t i = 0; i < arr.size(); ++i) {
                if (i > 0) tagsStr += ",";
                std::string tag = std::string(arr[i].as_string());
                tagsStr += "\"" + tag + "\"";
                newTags.push_back(tag);
            }
            tagsStr += "}";
            parts.push_back("tags = " + quote(tagsStr));
            contentChanged = true;
        }
        if (updates.contains("imageUrl")) {
            std::string rawImage = std::string(updates.at("imageUrl").as_string());
            
            // Si es base64, subir a Cloudinary
            if (!rawImage.empty() && (rawImage.find("data:image") == 0 || rawImage.find("/9j/") == 0 || rawImage.size() > 500)) {
                std::cout << "[Image] Uploading new base64 image..." << std::endl;
                newImageUrl = uploadImageToCloudinary(rawImage, "yung-accountant/posts/pictures");
                std::cout << "[Image] Uploaded: " << newImageUrl << std::endl;
            } else {
                newImageUrl = rawImage;
            }
            
            if (!newImageUrl.empty()) {
                parts.push_back("image_url = " + quote(newImageUrl));
                imageChanged = true;
                
                // Obtener imagen anterior para borrarla
                auto imgResult = txn.exec_params("SELECT image_url FROM posts WHERE id = $1", id);
                if (!imgResult.empty() && !imgResult[0]["image_url"].is_null()) {
                    oldImageUrl = imgResult[0]["image_url"].as<std::string>();
                }
            }
        }
        
        // Regenerar embedding
        if (contentChanged) {
            if (!updates.contains("title") || !updates.contains("content") || !updates.contains("tags")) {
                auto currentPost = txn.exec_params("SELECT title, content, tags FROM posts WHERE id = $1", id);
                if (!currentPost.empty()) {
                    if (!updates.contains("title")) newTitle = currentPost[0]["title"].as<std::string>();
                    if (!updates.contains("content")) newContent = currentPost[0]["content"].as<std::string>();
                    if (!updates.contains("tags")) {
                        std::string ts = currentPost[0]["tags"].as<std::string>();
                        if (ts != "{}") {
                            std::string c = ts.substr(1, ts.length() - 2);
                            std::stringstream ss(c);
                            std::string tag;
                            while (std::getline(ss, tag, ',')) {
                                tag.erase(std::remove(tag.begin(), tag.end(), '"'), tag.end());
                                tag.erase(std::remove(tag.begin(), tag.end(), ' '), tag.end());
                                if (!tag.empty()) newTags.push_back(tag);
                            }
                        }
                    }
                }
            }
            
            std::string tagsText;
            for (const auto& t : newTags) { if (!tagsText.empty()) tagsText += " "; tagsText += t; }
            std::string textToEmbed = newTitle + " " + newContent + " " + tagsText;
            std::vector<float> embedding = generateEmbedding(textToEmbed);
            
            if (!embedding.empty()) {
                std::string embeddingStr = "[";
                for (size_t i = 0; i < embedding.size(); ++i) {
                    if (i > 0) embeddingStr += ",";
                    embeddingStr += std::to_string(embedding[i]);
                }
                embeddingStr += "]";
                parts.push_back("embedding = " + quote(embeddingStr));
            }
        }
        
        if (parts.empty()) return false;
        for (size_t i = 0; i < parts.size(); ++i) { if (i > 0) query += ", "; query += parts[i]; }
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = " + quote(id) + " AND user_id = " + quote(userId);
        
        pqxx::result result = txn.exec(query);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidatePostsListCache();
            invalidateSearchCaches();
            invalidateTrendingCache();
            invalidatePersonalizedFeedCache(userId);
            // Borrar imagen anterior
            if (imageChanged && !oldImageUrl.empty() && oldImageUrl.find("cloudinary.com") != std::string::npos) {
                deleteCloudinaryImage(oldImageUrl);
            }
            
            return true;
        }
        return false;
    } catch (const std::exception& e) { 
        std::cerr << "Error updating post: " << e.what() << std::endl;
        return false; 
    }
}


bool CommunityService::deletePost(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // Obtener imageUrl antes de borrar
        std::string imageUrl;
        auto imgResult = txn.exec_params("SELECT image_url FROM posts WHERE id = $1", id);
        if (!imgResult.empty() && !imgResult[0]["image_url"].is_null()) {
            imageUrl = imgResult[0]["image_url"].as<std::string>();
        }
        
        auto result = txn.exec_params("DELETE FROM posts WHERE id = $1 AND user_id = $2", id, userId);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidatePostsListCache();
            invalidateSearchCaches();
            invalidateCommentsCache(id);
            invalidateTrendingCache();
            invalidatePersonalizedFeedCache(userId);
            
            auto& redis = redis::RedisClient::getInstance();
            if (redis.isConnected()) redis.del("community:comments:" + id);
            
            // Borrar imagen de Cloudinary
            if (!imageUrl.empty() && imageUrl.find("cloudinary.com") != std::string::npos) {
                deleteCloudinaryImage(imageUrl);
            }
            
            return true;
        }
        return false;
    } catch (const std::exception& e) { 
        std::cerr << "Error deleting post: " << e.what() << std::endl;
        return false; 
    }
}


// ============================================
// LIKES
// ============================================
bool CommunityService::toggleLikePost(const std::string& postId, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto checkResult = txn.exec_params("SELECT liked_by FROM posts WHERE id = $1", postId);
        if (checkResult.empty()) return false;
        
        std::string likedByStr = checkResult[0]["liked_by"].as<std::string>();
        bool alreadyLiked = likedByStr.find(userId) != std::string::npos;
        
        if (alreadyLiked) {
            txn.exec_params("UPDATE posts SET liked_by = array_remove(liked_by, $1::uuid), likes_count = likes_count - 1 WHERE id = $2", userId, postId);
        } else {
            txn.exec_params("UPDATE posts SET liked_by = array_append(liked_by, $1::uuid), likes_count = likes_count + 1 WHERE id = $2", userId, postId);
        }
        
        // Obtener el post actualizado para cachearlo
        auto updatedPost = txn.exec_params(
            "SELECT p.*, u.username, u.display_name, u.profile_pic as avatar, "
            "(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count "
            "FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1", postId);
        
        txn.commit();
        
        if (!updatedPost.empty()) {
            Post p = rowToPost(updatedPost[0]);
            p.username = updatedPost[0]["username"].as<std::string>();
            p.displayName = updatedPost[0]["display_name"].as<std::string>();
            p.avatar = updatedPost[0]["avatar"].is_null() ? "" : updatedPost[0]["avatar"].as<std::string>();
            p.commentsCount = updatedPost[0]["comments_count"].as<int>();
                        
            recordInteraction(userId, postId, !alreadyLiked, false);

            // También invalidar la lista para que se refresque
            invalidatePostsListCache();
            invalidateTrendingCache();
            invalidatePersonalizedFeedCache(userId);
        }
        
        return true;
    } catch (const std::exception& e) { 
        std::cerr << "Error toggling like: " << e.what() << std::endl;
        return false; 
    }
}




// ============================================
// COMMENTS
// ============================================
std::vector<Comment> CommunityService::getComments(const std::string& postId) {
    std::string cacheKey = "community:comments:" + postId;
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: comments for post " << postId << std::endl;
            return jsonToComments(*cached);
        }
    }
    
    std::vector<Comment> comments;
    try {
        PoolConnection pooled_conn;  
        auto& conn = pooled_conn.get();
        
        // Scope separado para la transacción
        {
            pqxx::work txn(conn);
            pqxx::result result = txn.exec_params(
                "SELECT c.*, u.username, u.display_name, u.profile_pic as avatar, "
                "(SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) as replies_count "
                "FROM comments c JOIN users u ON c.user_id = u.id "
                "WHERE c.post_id = $1 AND c.parent_id IS NULL "
                "ORDER BY c.created_at DESC", postId);
            txn.commit();
            
            for (const auto& row : result) {
                Comment c = rowToComment(row);
                c.username = row["username"].as<std::string>();
                c.displayName = row["display_name"].as<std::string>();
                c.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
                c.repliesCount = row["replies_count"].as<int>();
                
                if (c.repliesCount > 0) {
                    c.replies = getReplies(c.id);
                }
                comments.push_back(c);
            }
        } // ← txn se destruye aquí
        
        // Redis cache fuera del scope de la transacción
        if (redis.isConnected() && !comments.empty()) {
            redis.set(cacheKey, commentsToJson(comments), 120);
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error getting comments: " << e.what() << std::endl;
    }
    return comments;
}

std::vector<Comment> CommunityService::getReplies(const std::string& parentId) {
    std::vector<Comment> replies;
    try {
        PoolConnection pooled_conn;  
        auto& conn = pooled_conn.get();
        
        {
            pqxx::work txn(conn);
            pqxx::result result = txn.exec_params(
                "SELECT c.*, u.username, u.display_name, u.profile_pic as avatar "
                "FROM comments c JOIN users u ON c.user_id = u.id "
                "WHERE c.parent_id = $1 "
                "ORDER BY c.created_at ASC", parentId);
            txn.commit();
            
            for (const auto& row : result) {
                Comment c = rowToComment(row);
                c.username = row["username"].as<std::string>();
                c.displayName = row["display_name"].as<std::string>();
                c.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
                replies.push_back(c);
            }
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error getting replies: " << e.what() << std::endl;
    }
    return replies;
}



// En addComment - Invalidar solo el caché específico del post
std::optional<Comment> CommunityService::addComment(const Comment& comment) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "INSERT INTO comments (post_id, user_id, content) VALUES ($1,$2,$3) "
            "RETURNING id, created_at, updated_at",
            comment.postId, comment.userId, comment.content);
        txn.commit();
        
        if (!result.empty()) {
            Comment c = comment;
            c.id = result[0]["id"].as<std::string>();
            c.createdAt = result[0]["created_at"].as<std::string>();
            c.updatedAt = result[0]["updated_at"].as<std::string>();
            
            recordInteraction(comment.userId, comment.postId, false, true);

            // Invalidar comentarios del post y lista de posts
            invalidateCommentsCache(comment.postId);
            invalidatePostsListCache();
            invalidateTrendingCache();
            invalidatePersonalizedFeedCache(comment.userId);
            return c;
        }
        return std::nullopt;
    } catch (const std::exception& e) { 
        std::cerr << "Error adding comment: " << e.what() << std::endl;
        return std::nullopt; 
    }
}


bool CommunityService::updateComment(const std::string& commentId, const std::string& userId, const boost::json::object& updates) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // Primero obtener el post_id para invalidar caché después
        auto postResult = txn.exec_params("SELECT post_id FROM comments WHERE id = $1", commentId);
        std::string postId;
        if (!postResult.empty()) {
            postId = postResult[0]["post_id"].as<std::string>();
        }
        
        auto quote = [&](const std::string& s) { return txn.quote(s); };
        
        if (updates.contains("content")) {
            std::string query = "UPDATE comments SET content = " + quote(std::string(updates.at("content").as_string())) +
                               ", updated_at = CURRENT_TIMESTAMP WHERE id = " + quote(commentId) + " AND user_id = " + quote(userId);
            auto result = txn.exec(query);
            txn.commit();
            
            if (result.affected_rows() > 0 && !postId.empty()) {
                // Invalidar caché del post y comentarios
                recordInteraction(userId, postId, false, true);
                invalidateCommentsCache(postId);
                invalidatePostsListCache();
                invalidateTrendingCache();
                invalidatePersonalizedFeedCache(userId);
                return true;
            }
        }
        return false;
    } catch (const std::exception& e) { 
        std::cerr << "Error updating comment: " << e.what() << std::endl;
        return false; 
    }
}


bool CommunityService::deleteComment(const std::string& commentId, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // Obtener post_id antes de eliminar
        auto postResult = txn.exec_params("SELECT post_id FROM comments WHERE id = $1", commentId);
        std::string postId;
        if (!postResult.empty()) {
            postId = postResult[0]["post_id"].as<std::string>();
        }
        
        // Eliminar respuestas primero
        txn.exec_params("DELETE FROM comments WHERE parent_id = $1", commentId);
        auto result = txn.exec_params("DELETE FROM comments WHERE id = $1 AND user_id = $2", commentId, userId);
        txn.commit();
        
        if (result.affected_rows() > 0 && !postId.empty()) {
            recordInteraction(userId, postId, false, false);
            // Invalidar caché del post y comentarios
            invalidateCommentsCache(postId);
            invalidatePostsListCache();
            invalidateTrendingCache();
            invalidatePersonalizedFeedCache(userId);
            
            return true;
        }
        return false;
    } catch (const std::exception& e) { 
        std::cerr << "Error deleting comment: " << e.what() << std::endl;
        return false; 
    }
}



bool CommunityService::toggleLikeComment(const std::string& commentId, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto checkResult = txn.exec_params("SELECT liked_by, post_id FROM comments WHERE id = $1", commentId);
        if (checkResult.empty()) return false;
        
        std::string likedByStr = checkResult[0]["liked_by"].as<std::string>();
        bool alreadyLiked = likedByStr.find(userId) != std::string::npos;
        std::string postId = checkResult[0]["post_id"].as<std::string>();
        
        if (alreadyLiked) {
            txn.exec_params("UPDATE comments SET liked_by = array_remove(liked_by, $1::uuid), likes_count = likes_count - 1 WHERE id = $2", userId, commentId);
        } else {
            txn.exec_params("UPDATE comments SET liked_by = array_append(liked_by, $1::uuid), likes_count = likes_count + 1 WHERE id = $2", userId, commentId);
        }
        txn.commit();
        
        // Invalidar comentarios y lista (se refrescarán en próxima lectura)
        recordInteraction(userId, postId, true, false);
        invalidateCommentsCache(postId);
        invalidatePostsListCache();
        invalidateTrendingCache();
        invalidatePersonalizedFeedCache(userId);
        
        return true;
    } catch (const std::exception& e) { 
        std::cerr << "Error toggling comment like: " << e.what() << std::endl;
        return false; 
    }
}



// ============================================
// REPLIES
// ============================================
std::optional<Comment> CommunityService::addReply(const Comment& reply) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // 🎯 Si no tiene postId, obtenerlo del padre
        std::string postId = reply.postId;
        if (postId.empty() && !reply.parentId.empty()) {
            auto parentResult = txn.exec_params(
                "SELECT post_id FROM comments WHERE id = $1", reply.parentId);
            if (!parentResult.empty()) {
                postId = parentResult[0]["post_id"].as<std::string>();
            }
        }
        
        auto result = txn.exec_params(
            "INSERT INTO comments (post_id, user_id, parent_id, content) VALUES ($1,$2,$3,$4) "
            "RETURNING id, created_at, updated_at",
            postId, reply.userId, reply.parentId, reply.content);
        txn.commit();
        
        if (!result.empty()) {
            Comment c = reply;
            c.id = result[0]["id"].as<std::string>();
            c.createdAt = result[0]["created_at"].as<std::string>();
            c.updatedAt = result[0]["updated_at"].as<std::string>();
            c.postId = postId;

            recordInteraction(reply.userId, postId, false, true);
            invalidateCommentsCache(postId);
            invalidatePostsListCache();
            invalidateTrendingCache();
            invalidatePersonalizedFeedCache(reply.userId);
            
            return c;
        }
        return std::nullopt;
    } catch (const std::exception& e) { 
        std::cerr << "Error adding reply: " << e.what() << std::endl;
        return std::nullopt; 
    }
}

// ============================================
// BÚSQUEDA Y RECOMENDACIONES
// ============================================
std::vector<Post> CommunityService::searchPosts(const std::string& query, const std::string& userId, int page, int limit) {
    std::vector<Post> posts;
    
    std::cout << "=== SEARCH DEBUG ===" << std::endl;
    std::cout << "Query: '" << query << "'" << std::endl;
    std::cout << "User: " << userId << std::endl;
    std::cout << "Page: " << page << ", Limit: " << limit << std::endl;
    
    std::string cacheKey = "community:search:posts:" + query + ":" + 
                           std::to_string(page) + ":" + std::to_string(limit);
    
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT for search" << std::endl;
            return jsonToPosts(*cached);
        }
    }
    
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // Usar search_posts_optimized
        pqxx::result result = txn.exec_params(
            "SELECT * FROM search_posts_optimized($1, $2, $3, $4)",
            query, userId, page, limit);
        txn.commit();
        
        std::cout << "Rows returned: " << result.size() << std::endl;
        
        for (const auto& row : result) {
            Post p = rowToPost(row);
            p.username = row["username"].as<std::string>();
            p.displayName = row["display_name"].as<std::string>();
            p.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
            p.commentsCount = row["comments_count"].as<int>();
            p.likesCount = row["likes_count"].as<int>();
            p.searchRank = row["rank"].as<double>();
            
            std::cout << "  - " << p.title << " (rank: " << p.searchRank << ")" << std::endl;
            
            posts.push_back(p);
        }
        
        if (redis.isConnected() && !posts.empty()) {
            redis.set(cacheKey, postsToJson(posts), 120);
        }
        
        std::cout << "Total results: " << posts.size() << std::endl;
        std::cout << "===================" << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "Error searching posts: " << e.what() << std::endl;
        std::cout << "===================" << std::endl;
    }
    
    return posts;
}

std::vector<Post> CommunityService::getRecommendedPosts(const std::string& userId, int limit) {
    // Intentar cache primero
    std::string cacheKey = "community:recommended:" + userId + ":" + std::to_string(limit);
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: recommended posts for user " << userId << std::endl;
            return jsonToPosts(*cached);
        }
    }
    
    std::vector<Post> posts;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // Usar la función optimizada en lugar del SQL inline
        pqxx::result result = txn.exec_params(
            "SELECT * FROM get_recommended_posts_optimized($1, $2)",
            userId, limit);
        txn.commit();
        
        for (const auto& row : result) {
            Post p = rowToPost(row);
            p.username = row["username"].as<std::string>();
            p.displayName = row["display_name"].as<std::string>();
            p.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
            p.commentsCount = row["comments_count"].as<int>();
            posts.push_back(p);
            
        }
        
        if (redis.isConnected() && !posts.empty()) {
            redis.set(cacheKey, postsToJson(posts), 300);
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error getting recommended posts: " << e.what() << std::endl;
    }
    return posts;
}

std::vector<Post> CommunityService::getPostsByTag(const std::string& tag, int page, int limit) {
    // Intentar cache primero
    std::string cacheKey = "community:tags:" + tag + ":" + std::to_string(page) + ":" + std::to_string(limit);
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: posts by tag '" << tag << "' page " << page << std::endl;
            return jsonToPosts(*cached);
        }
    }
    
    std::vector<Post> posts;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT p.*, u.username, u.display_name, u.profile_pic as avatar, "
            "(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count "
            "FROM posts p JOIN users u ON p.user_id = u.id "
            "WHERE $1 = ANY(p.tags) ORDER BY p.created_at DESC LIMIT $2 OFFSET $3",
            tag, limit, (page - 1) * limit);
        txn.commit();
        
        for (const auto& row : result) {
            Post p = rowToPost(row);
            p.username = row["username"].as<std::string>();
            p.displayName = row["display_name"].as<std::string>();
            p.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
            p.commentsCount = row["comments_count"].as<int>();
            posts.push_back(p);
            
        }
        
        // Cachear resultado (TTL: 5 minutos)
        if (redis.isConnected() && !posts.empty()) {
            redis.set(cacheKey, postsToJson(posts), 300); // 5 minutos
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error getting posts by tag: " << e.what() << std::endl;
    }
    return posts;
}


std::vector<UserSearchResult> CommunityService::searchUsers(const std::string& query, int page, int limit, const std::string& currentUserId) {
    std::vector<UserSearchResult> users;
    
    // PARÁMETROS ESPECIALES
    if (query == "$recommended$") {
        return getRecommendedUsers(limit, currentUserId);
    }
    if (query == "$trending$") {
        return getTrendingUsers(limit);
    }
    
    // Normalizar query normal
    std::string normalizedQuery = query;
    std::transform(normalizedQuery.begin(), normalizedQuery.end(), normalizedQuery.begin(), ::tolower);
    
    std::cout << "[SEARCH USERS] Query: '" << normalizedQuery << "'" << std::endl;
    std::string cacheKey = "community:users:search:" + normalizedQuery + ":" + 
                           std::to_string(page) + ":" + std::to_string(limit);
    
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: users search" << std::endl;
            return parseUserSearchResultsFromJson(*cached);
        }
    }
    
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        pqxx::result result = txn.exec_params(
            "SELECT * FROM search_users_trgm($1, $2, $3)",
            normalizedQuery, page, limit);
        txn.commit();
        
        for (const auto& row : result) {
            users.push_back(rowToUserSearchResult(row));
        }
        
        if (redis.isConnected() && !users.empty()) {
            redis.set(cacheKey, userSearchResultsToJson(users), 120);
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error searching users: " << e.what() << std::endl;
    }
    
    return users;
}

std::vector<UserSearchResult> CommunityService::getRecommendedUsers(int limit, const std::string& currentUserId) {
    std::vector<UserSearchResult> users;
    
    std::string cacheKey = "community:users:recommended:" + std::to_string(limit);
    if (!currentUserId.empty()) {
        cacheKey += ":" + currentUserId;
    }
    
    // Intentar Redis primero
    try {
        auto& redis = redis::RedisClient::getInstance();
        if (redis.isConnected()) {
            auto cached = redis.get(cacheKey);
            if (cached) {
                std::cout << "[Redis] Cache HIT: recommended users" << std::endl;
                auto result = parseUserSearchResultsFromJson(*cached);
                if (!result.empty()) return result;
            }
            std::cout << "[Redis] Cache MISS for key: " << cacheKey << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << "Redis error in getRecommendedUsers: " << e.what() << std::endl;
    }
    
    // Intentar PostgreSQL
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        
        // Verificar conexión antes de usar
        if (!conn.is_open()) {
            std::cerr << "Database connection is closed!" << std::endl;
            return users;
        }
        
        pqxx::work txn(conn);
        
        pqxx::result result;
        
        if (!currentUserId.empty()) {
            result = txn.exec_params(
                "SELECT u.id, u.username, u.display_name, u.profile_pic as avatar, u.bio, "
                "COALESCE(array_length(u.followers, 1), 0) as followers_count, "
                "COALESCE((SELECT COUNT(*) FROM posts WHERE user_id = u.id), 0) as posts_count "
                "FROM users u "
                "WHERE u.id != $1::uuid "
                "AND u.id::text != ALL(COALESCE("
                "  (SELECT following FROM users WHERE id = $1::uuid), "
                "  '{}'"
                ")) "
                "ORDER BY followers_count DESC, posts_count DESC "
                "LIMIT $2",
                currentUserId, limit);
        } else {
            result = txn.exec_params(
                "SELECT u.id, u.username, u.display_name, u.profile_pic as avatar, u.bio, "
                "COALESCE(array_length(u.followers, 1), 0) as followers_count, "
                "COALESCE((SELECT COUNT(*) FROM posts WHERE user_id = u.id), 0) as posts_count "
                "FROM users u "
                "ORDER BY followers_count DESC, posts_count DESC "
                "LIMIT $1",
                limit);
        }
        txn.commit();
        
        std::cout << "[RECOMMENDED USERS] Found " << result.size() << " users" << std::endl;
        
        for (const auto& row : result) {
            try {
                users.push_back(rowToUserSearchResult(row));
            } catch (const std::exception& e) {
                std::cerr << "Error mapping user row: " << e.what() << std::endl;
            }
        }
        
        // Cachear en Redis
        try {
            auto& redis = redis::RedisClient::getInstance();
            if (redis.isConnected() && !users.empty()) {
                redis.set(cacheKey, userSearchResultsToJson(users), 120);
                std::cout << "[Redis] Cached key: " << cacheKey << " for 120s" << std::endl;
            }
        } catch (const std::exception& e) {
            std::cerr << "Redis cache error: " << e.what() << std::endl;
        }
        
    } catch (const pqxx::broken_connection& e) {
        std::cerr << "Database connection broken in getRecommendedUsers: " << e.what() << std::endl;
    } catch (const pqxx::sql_error& e) {
        std::cerr << "SQL error in getRecommendedUsers: " << e.what() << std::endl;
        std::cerr << "Query: " << e.query() << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error getting recommended users: " << e.what() << std::endl;
    } catch (...) {
        std::cerr << "Unknown error in getRecommendedUsers!" << std::endl;
    }
    
    return users;
}

std::vector<Post> CommunityService::getTrendingPosts(int limit) {
    std::string cacheKey = "community:trending:posts:" + std::to_string(limit);
    
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: trending posts" << std::endl;
            return jsonToPosts(*cached);
        }
    }
    
    std::vector<Post> posts;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        pqxx::result result = txn.exec_params(
            "SELECT * FROM get_trending_posts($1)", limit);
        txn.commit();
        
        for (const auto& row : result) {
            Post p = rowToPost(row);
            p.username = row["username"].as<std::string>();
            p.displayName = row["display_name"].as<std::string>();
            p.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
            p.commentsCount = row["comments_count"].as<int>();
            posts.push_back(p);
        }
        
        if (redis.isConnected() && !posts.empty()) {
            redis.set(cacheKey, postsToJson(posts), 120); // 2 minutos
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error getting trending posts: " << e.what() << std::endl;
    }
    return posts;
}


std::vector<UserSearchResult> CommunityService::getTrendingUsers(int limit) {
    std::vector<UserSearchResult> users;
    
    std::string cacheKey = "community:users:trending:" + std::to_string(limit);
    
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: trending users" << std::endl;
            return parseUserSearchResultsFromJson(*cached);
        }
    }
    
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // Usar array_length y posts recientes
        pqxx::result result = txn.exec_params(
            "SELECT u.id, u.username, u.display_name, u.profile_pic as avatar, u.bio, "
            "COALESCE(array_length(u.followers, 1), 0) as followers_count, "  // ← array_length
            "COALESCE((SELECT COUNT(*) FROM posts WHERE user_id = u.id), 0) as posts_count, "
            "COALESCE((SELECT COUNT(*) FROM posts WHERE user_id = u.id AND created_at > NOW() - INTERVAL '7 days'), 0) as recent_posts "
            "FROM users u "
            "ORDER BY recent_posts DESC, followers_count DESC "
            "LIMIT $1", limit);
        txn.commit();
        
        for (const auto& row : result) {
            users.push_back(rowToUserSearchResult(row));
        }
        
        if (redis.isConnected() && !users.empty()) {
            redis.set(cacheKey, userSearchResultsToJson(users), 120);
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error getting trending users: " << e.what() << std::endl;
    }
    
    return users;
}

// También necesitamos parseUserSearchResultsFromJson si no existe
std::vector<UserSearchResult> CommunityService::parseUserSearchResultsFromJson(const std::string& json) {
    std::vector<UserSearchResult> users;
    
    try {
        auto jv = boost::json::parse(json);
        
        // Verificar que sea un array
        if (!jv.is_array()) {
            std::cerr << "[PARSE] JSON is not an array!" << std::endl;
            return users;
        }
        
        for (const auto& item : jv.as_array()) {
            // Verificar que sea un objeto
            if (!item.is_object()) {
                std::cerr << "[PARSE] Array item is not an object!" << std::endl;
                continue;
            }
            
            auto& obj = item.as_object();
            UserSearchResult u;
            
            // Usar .contains() y try/catch para cada campo
            try {
                u.id = obj.contains("id") && !obj.at("id").is_null() 
                    ? boost::json::value_to<std::string>(obj.at("id")) : "";
                u.username = obj.contains("username") && !obj.at("username").is_null()
                    ? boost::json::value_to<std::string>(obj.at("username")) : "";
                u.displayName = obj.contains("displayName") && !obj.at("displayName").is_null()
                    ? boost::json::value_to<std::string>(obj.at("displayName")) : u.username;
                u.avatar = obj.contains("avatar") && !obj.at("avatar").is_null()
                    ? boost::json::value_to<std::string>(obj.at("avatar")) : "";
                u.bio = obj.contains("bio") && !obj.at("bio").is_null()
                    ? boost::json::value_to<std::string>(obj.at("bio")) : "";
                u.followersCount = obj.contains("followersCount") 
                    ? static_cast<int>(obj.at("followersCount").as_int64()) : 0;
                u.postsCount = obj.contains("postsCount")
                    ? static_cast<int>(obj.at("postsCount").as_int64()) : 0;
                
                users.push_back(u);
            } catch (const std::exception& e) {
                std::cerr << "[PARSE] Error parsing user: " << e.what() << std::endl;
                // Continuar con el siguiente usuario
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "[PARSE] Error parsing JSON: " << e.what() << std::endl;
    }
    
    return users;
}

// ============================================
// FOLLOW/UNFOLLOW
// ============================================

bool CommunityService::followUser(const std::string& followerId, const std::string& targetUserId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        txn.exec_params(
            "UPDATE users SET following = array_append(COALESCE(following, '{}'), $1::text) "
            "WHERE id = $2 AND NOT ($1::text = ANY(COALESCE(following, '{}')))",
            targetUserId, followerId);
        
        txn.exec_params(
            "UPDATE users SET followers = array_append(COALESCE(followers, '{}'), $1::text) "
            "WHERE id = $2 AND NOT ($1::text = ANY(COALESCE(followers, '{}')))",
            followerId, targetUserId);
        
        txn.commit();
        
        // Invalidar caches de recommended users para el seguidor
        invalidateFollowCaches(followerId);
        invalidateUserStatsCache();
        
        std::cout << "[FOLLOW] " << followerId << " -> " << targetUserId << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error following user: " << e.what() << std::endl;
        return false;
    }
}


bool CommunityService::unfollowUser(const std::string& followerId, const std::string& targetUserId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        txn.exec_params(
            "UPDATE users SET following = array_remove(COALESCE(following, '{}'), $1::text) "
            "WHERE id = $2", targetUserId, followerId);
        
        txn.exec_params(
            "UPDATE users SET followers = array_remove(COALESCE(followers, '{}'), $1::text) "
            "WHERE id = $2", followerId, targetUserId);
        
        txn.commit();
        
        invalidateFollowCaches(followerId);
        invalidateUserStatsCache();
        
        std::cout << "[UNFOLLOW] " << followerId << " -> " << targetUserId << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error unfollowing user: " << e.what() << std::endl;
        return false;
    }
}


bool CommunityService::isFollowing(const std::string& followerId, const std::string& targetUserId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto result = txn.exec_params(
            "SELECT $1::text = ANY(COALESCE(following, '{}')) as is_following "
            "FROM users WHERE id = $2",
            targetUserId, followerId);
        txn.commit();
        
        if (!result.empty()) {
            return result[0]["is_following"].as<bool>();
        }
        return false;
        
    } catch (const std::exception& e) {
        std::cerr << "Error checking follow status: " << e.what() << std::endl;
        return false;
    }
}

boost::json::object CommunityService::getUserStats(const std::string& username) {
    boost::json::object stats;
    
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto result = txn.exec_params(
            "SELECT "
            "COALESCE(array_length(followers, 1), 0) as followers_count, "
            "COALESCE(array_length(following, 1), 0) as following_count, "
            "COALESCE((SELECT COUNT(*) FROM posts WHERE user_id = u.id), 0) as posts_count "
            "FROM users u WHERE u.username = $1",
            username);
        txn.commit();
        
        if (!result.empty()) {
            stats["followersCount"] = result[0]["followers_count"].as<int>();
            stats["followingCount"] = result[0]["following_count"].as<int>();
            stats["postsCount"] = result[0]["posts_count"].as<int>();
        } else {
            stats["followersCount"] = 0;
            stats["followingCount"] = 0;
            stats["postsCount"] = 0;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error getting user stats: " << e.what() << std::endl;
        stats["followersCount"] = 0;
        stats["followingCount"] = 0;
        stats["postsCount"] = 0;
    }
    
    return stats;
}

std::vector<Post> CommunityService::getPostsByUser(const std::string& userId) {
    std::vector<Post> posts;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto result = txn.exec_params(
            "SELECT p.*, u.username, u.display_name, u.profile_pic as avatar, "
            "(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count "
            "FROM posts p JOIN users u ON p.user_id = u.id "
            "WHERE p.user_id = $1::uuid "
            "ORDER BY p.created_at DESC LIMIT 50", userId);
        txn.commit();
        
        for (const auto& row : result) {
            Post p = rowToPost(row);
            p.username = row["username"].as<std::string>();
            p.displayName = row["display_name"].as<std::string>();
            p.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
            p.commentsCount = row["comments_count"].as<int>();
            posts.push_back(p);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting user posts: " << e.what() << std::endl;
    }
    return posts;
}


// ============================================
// FEED
// ============================================
std::vector<Post> CommunityService::getPersonalizedFeed(const std::string& userId, int limit) {
    std::string cacheKey = "community:personalized:feed:" + userId + ":" + std::to_string(limit);
    
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: personalized feed for user " << userId << std::endl;
            return jsonToPosts(*cached);
        }
    }
    
    std::vector<Post> posts;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        pqxx::result result = txn.exec_params(
            "SELECT * FROM get_personalized_feed($1, $2)", userId, limit);
        txn.commit();
        
        for (const auto& row : result) {
            Post p = rowToPost(row);
            p.username = row["username"].as<std::string>();
            p.displayName = row["display_name"].as<std::string>();
            p.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
            p.commentsCount = row["comments_count"].as<int>();
            posts.push_back(p);
        }
        
        if (redis.isConnected() && !posts.empty()) {
            redis.set(cacheKey, postsToJson(posts), 120);
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error getting personalized feed: " << e.what() << std::endl;
    }
    return posts;
}


void CommunityService::recordInteraction(const std::string& userId, const std::string& postId, 
                                          bool liked, bool commented) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        txn.exec_params(
            "INSERT INTO user_post_interactions (user_id, post_id, liked, commented) "
            "VALUES ($1, $2, $3, $4) "
            "ON CONFLICT (user_id, post_id) DO UPDATE SET "
            "liked = EXCLUDED.liked, "
            "commented = EXCLUDED.commented, "
            "viewed_at = CURRENT_TIMESTAMP",
            userId, postId, liked, commented);
        txn.commit();
    } catch (const std::exception& e) {
        std::cerr << "Error recording interaction: " << e.what() << std::endl;
    }
}

void CommunityService::recordView(const std::string& userId, const std::string& postId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        txn.exec_params(
            "INSERT INTO user_post_interactions (user_id, post_id, liked, commented, viewed_at) "
            "VALUES ($1, $2, false, false, CURRENT_TIMESTAMP) "
            "ON CONFLICT (user_id, post_id) DO UPDATE SET "
            "viewed_at = CURRENT_TIMESTAMP",
            userId, postId);
        txn.commit();
    } catch (const std::exception& e) {
        std::cerr << "Error recording view: " << e.what() << std::endl;
    }
}

// ============================================
// CACHE
// ============================================

std::optional<std::vector<Post>> CommunityService::getCachedPostsList(int page, int limit) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        std::string key = "community:posts:list:" + std::to_string(page) + ":" + std::to_string(limit);
        auto cached = redis.get(key);
        if (cached) {
            return jsonToPosts(*cached);
        }
    }
    return std::nullopt;
}

void CommunityService::cachePostsList(int page, int limit, const std::vector<Post>& posts) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected() && !posts.empty()) {
        std::string key = "community:posts:list:" + std::to_string(page) + ":" + std::to_string(limit);
        redis.set(key, postsToJson(posts), 300); // 5 minutos
    }
}

void CommunityService::invalidatePostsListCache() {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.delByPattern("community:posts:list:*");
        std::cout << "[Cache] DEL posts:list:*" << std::endl;
    }
}

void CommunityService::invalidateTrendingCache() {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.delByPattern("community:trending:posts:*");
        std::cout << "[Cache] DEL trending:posts:*" << std::endl;
    }
}

void CommunityService::invalidatePersonalizedFeedCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.delByPattern("community:personalized:*:" + userId);
        std::cout << "[Cache] DEL personalized feed for user: " << userId << std::endl;
    }
}

void CommunityService::invalidateSearchCaches() {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.delByPattern("community:search:posts:*");
        redis.delByPattern("community:tags:*");
        redis.delByPattern("community:recommended:*");
        std::cout << "[Cache] DEL search caches" << std::endl;
    }
}

void CommunityService::invalidateCommentsCache(const std::string& postId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.del("community:comments:" + postId);
        std::cout << "[Cache] DEL comments:" << postId << std::endl;
    }
}

void CommunityService::invalidateFollowCaches(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.delByPattern("community:users:recommended:*:" + userId);
        std::cout << "[Cache] DEL recommended for user: " << userId << std::endl;
    }
}

void CommunityService::invalidateUserStatsCache() {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.delByPattern("community:users:search:*");
        std::cout << "[Cache] DEL user stats/search caches" << std::endl;
    }
}
// ============================================
// ROW MAPPERS
// ============================================
Post CommunityService::rowToPost(const pqxx::row& row) {
    Post p;
    
    // Usar try/catch para cada columna que podría faltar
    try { p.id = row["id"].as<std::string>(); } catch (...) { p.id = ""; }
    try { p.userId = row["user_id"].as<std::string>(); } catch (...) { p.userId = ""; }
    try { p.title = row["title"].as<std::string>(); } catch (...) { p.title = ""; }
    try { p.content = row["content"].as<std::string>(); } catch (...) { p.content = ""; }
    try { p.likesCount = row["likes_count"].as<int>(); } catch (...) { p.likesCount = 0; }
    try { p.createdAt = row["created_at"].as<std::string>(); } catch (...) { p.createdAt = ""; }
    try { p.updatedAt = row["updated_at"].as<std::string>(); } catch (...) { p.updatedAt = p.createdAt; }
    try { p.imageUrl = row["image_url"].is_null() ? "" : row["image_url"].as<std::string>(); } catch (...) { p.imageUrl = ""; }
    
    // liked_by
    try {
        std::string likedByStr = row["liked_by"].as<std::string>();
        if (likedByStr != "{}") {
            std::string content = likedByStr.substr(1, likedByStr.length() - 2);
            std::stringstream ss(content);
            std::string id;
            while (std::getline(ss, id, ',')) {
                if (!id.empty()) p.likedBy.push_back(id);
            }
        }
    } catch (...) {}
    
    // tags
    try {
        std::string tagsStr = row["tags"].as<std::string>();
        if (tagsStr != "{}") {
            std::string content = tagsStr.substr(1, tagsStr.length() - 2);
            std::stringstream ss(content);
            std::string tag;
            while (std::getline(ss, tag, ',')) {
                tag.erase(std::remove(tag.begin(), tag.end(), '"'), tag.end());
                tag.erase(std::remove(tag.begin(), tag.end(), ' '), tag.end());
                if (!tag.empty()) p.tags.push_back(tag);
            }
        }
    } catch (...) {}
    
    return p;
}



UserSearchResult CommunityService::rowToUserSearchResult(const pqxx::row& row) {
    UserSearchResult u;
    try {
        u.id = row["id"].as<std::string>();
        u.username = row["username"].as<std::string>();
        u.displayName = row["display_name"].is_null() ? u.username : row["display_name"].as<std::string>();
        u.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
        u.bio = row["bio"].is_null() ? "" : row["bio"].as<std::string>();
        u.followersCount = row["followers_count"].as<int>();
        u.postsCount = row["posts_count"].as<int>();
    } catch (const std::exception& e) {
        std::cerr << "Error in rowToUserSearchResult: " << e.what() << std::endl;
        for (const auto& col : row) {
            std::cerr << "  Column: " << col.name() << std::endl;
        }
    }
    return u;
}

Comment CommunityService::rowToComment(const pqxx::row& row) {
    Comment c;
    c.id = row["id"].as<std::string>();
    c.postId = row["post_id"].as<std::string>();
    c.userId = row["user_id"].as<std::string>();
    c.parentId = row["parent_id"].is_null() ? "" : row["parent_id"].as<std::string>();
    c.content = row["content"].as<std::string>();
    c.likesCount = row["likes_count"].as<int>();
    c.createdAt = row["created_at"].as<std::string>();
    c.updatedAt = row["updated_at"].as<std::string>();
    
    std::string likedByStr = row["liked_by"].as<std::string>();
    if (likedByStr != "{}") {
        std::string content = likedByStr.substr(1, likedByStr.length() - 2);
        std::stringstream ss(content);
        std::string id;
        while (std::getline(ss, id, ',')) {
            // Limpiar espacios y comillas
            id.erase(std::remove(id.begin(), id.end(), '"'), id.end());
            id.erase(std::remove(id.begin(), id.end(), ' '), id.end());
            if (!id.empty()) c.likedBy.push_back(id);
        }
    }
    return c;
}

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

std::vector<float> CommunityService::generateEmbedding(const std::string& text) {
    std::vector<float> embedding;
    
    try {
        CURL* curl = curl_easy_init();
        if (!curl) return embedding;

        const char* embeddingUrl = std::getenv("EMBEDDING_SERVICE_URL") 
            ? std::getenv("EMBEDDING_SERVICE_URL") 
            : "http://embedding-onnx:8090";
        
        boost::json::object requestBody;
        boost::json::array texts;
        texts.push_back(boost::json::value(text));
        requestBody["texts"] = texts;
        
        std::string jsonStr = boost::json::serialize(requestBody);
        std::string responseStr;
        
        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        
        curl_easy_setopt(curl, CURLOPT_URL, (std::string(embeddingUrl) + "/embed").c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonStr.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, jsonStr.size());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseStr);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
        
        CURLcode res = curl_easy_perform(curl);
        
        if (res == CURLE_OK) {
            auto jv = boost::json::parse(responseStr);
            auto& embeddings = jv.as_object()["embeddings"].as_array();
            if (!embeddings.empty()) {
                for (const auto& val : embeddings[0].as_array()) {
                    embedding.push_back(val.to_number<float>());
                }
            }
        }
        
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        
    } catch (const std::exception& e) {
        std::cerr << "Error generating embedding: " << e.what() << std::endl;
    }
    
    return embedding;
}

std::string CommunityService::uploadImageToCloudinary(const std::string& base64Image, const std::string& folder) {
    try {
        std::string cloudName = std::getenv("CLOUDINARY_CLOUD_NAME") ? std::getenv("CLOUDINARY_CLOUD_NAME") : "dypeuv53w";
        std::string apiKey = std::getenv("CLOUDINARY_API_KEY") ? std::getenv("CLOUDINARY_API_KEY") : "";
        std::string apiSecret = std::getenv("CLOUDINARY_API_SECRET") ? std::getenv("CLOUDINARY_API_SECRET") : "";
        
        if (apiKey.empty() || apiSecret.empty()) {
            std::cerr << "[Cloudinary] Missing API credentials" << std::endl;
            return "";
        }
        
        long long timestamp = std::time(nullptr);
        std::string toSign = "folder=" + folder + "&timestamp=" + std::to_string(timestamp) + apiSecret;
        
        unsigned char hash[20];
        SHA1(reinterpret_cast<const unsigned char*>(toSign.c_str()), toSign.size(), hash);
        std::stringstream signature;
        for (int i = 0; i < 20; i++) {
            signature << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
        }
        
        std::string uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload";
        
        CURL* curl = curl_easy_init();
        if (!curl) return "";
        
        curl_mime* mime = curl_mime_init(curl);
        
        // Imagen
        curl_mimepart* part = curl_mime_addpart(mime);
        curl_mime_name(part, "file");
        curl_mime_data(part, base64Image.c_str(), base64Image.size());
        curl_mime_filename(part, "post.jpg");
        
        // API Key (firmado)
        part = curl_mime_addpart(mime);
        curl_mime_name(part, "api_key");
        curl_mime_data(part, apiKey.c_str(), CURL_ZERO_TERMINATED);
        
        // Timestamp
        part = curl_mime_addpart(mime);
        curl_mime_name(part, "timestamp");
        curl_mime_data(part, std::to_string(timestamp).c_str(), CURL_ZERO_TERMINATED);
        
        // Signature
        part = curl_mime_addpart(mime);
        curl_mime_name(part, "signature");
        curl_mime_data(part, signature.str().c_str(), CURL_ZERO_TERMINATED);
        
        // Folder (opcional)
        part = curl_mime_addpart(mime);
        curl_mime_name(part, "folder");
        curl_mime_data(part, folder.c_str(), CURL_ZERO_TERMINATED);
        
        std::string responseStr;
        curl_easy_setopt(curl, CURLOPT_URL, uploadUrl.c_str());
        curl_easy_setopt(curl, CURLOPT_MIMEPOST, mime);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseStr);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15L);
        
        CURLcode res = curl_easy_perform(curl);
        curl_mime_free(mime);
        curl_easy_cleanup(curl);
        
        if (res == CURLE_OK) {
            auto jv = boost::json::parse(responseStr);
            if (jv.as_object().contains("secure_url")) {
                std::cout << "[Cloudinary] Upload success" << std::endl;
                return std::string(jv.as_object().at("secure_url").as_string());
            }
            std::cerr << "[Cloudinary] Upload failed: " << responseStr << std::endl;
        } else {
            std::cerr << "[Cloudinary] CURL error: " << curl_easy_strerror(res) << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << "[Cloudinary] Exception: " << e.what() << std::endl;
    }
    
    return "";
}

void CommunityService::deleteCloudinaryImage(const std::string& imageUrl) {
    if (imageUrl.find("cloudinary.com") == std::string::npos) return;
    
    // Extraer public_id
    size_t uploadPos = imageUrl.find("/upload/");
    if (uploadPos == std::string::npos) return;
    
    size_t vPos = imageUrl.find("/v", uploadPos);
    if (vPos == std::string::npos) return;
    
    size_t idStart = imageUrl.find("/", vPos + 2);
    if (idStart == std::string::npos) return;
    idStart++;
    
    size_t idEnd = imageUrl.find_last_of(".");
    std::string publicId = imageUrl.substr(idStart, idEnd - idStart);
    
    std::string cloudName = std::getenv("CLOUDINARY_CLOUD_NAME") ? std::getenv("CLOUDINARY_CLOUD_NAME") : "dypeuv53w";
    std::string apiKey = std::getenv("CLOUDINARY_API_KEY") ? std::getenv("CLOUDINARY_API_KEY") : "";
    std::string apiSecret = std::getenv("CLOUDINARY_API_SECRET") ? std::getenv("CLOUDINARY_API_SECRET") : "";
    
    if (apiKey.empty() || apiSecret.empty()) return;
    
    long long timestamp = std::time(nullptr);
    std::string toSign = "public_id=" + publicId + "&timestamp=" + std::to_string(timestamp) + apiSecret;
    
    unsigned char hash[20];
    SHA1(reinterpret_cast<const unsigned char*>(toSign.c_str()), toSign.size(), hash);
    std::stringstream signature;
    for (int i = 0; i < 20; i++) signature << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    
    std::string deleteUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/destroy";
    std::string deleteBody = "public_id=" + publicId + "&timestamp=" + std::to_string(timestamp) + "&api_key=" + apiKey + "&signature=" + signature.str();
    
    CURL* curl = curl_easy_init();
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, deleteUrl.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, deleteBody.c_str());
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);
        curl_easy_perform(curl);
        curl_easy_cleanup(curl);
    }
}