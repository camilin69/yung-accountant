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
#include <openssl/evp.h>

// ============================================
// CONSTANTES DE SETS
// ============================================
namespace CacheSets {
    constexpr const char* POSTS_LIST = "cache:set:posts:list";
    constexpr const char* SEARCH_POSTS = "cache:set:search:posts";
    constexpr const char* SEARCH_TAGS = "cache:set:search:tags";
    constexpr const char* RECOMMENDED_POSTS = "cache:set:recommended:posts";
    constexpr const char* RECOMMENDED_USERS = "cache:set:recommended:users";
    constexpr const char* TRENDING_POSTS = "cache:set:trending:posts";
    constexpr const char* TRENDING_USERS = "cache:set:trending:users";
    constexpr const char* PERSONALIZED_FEED = "cache:set:personalized:feed";
    constexpr const char* COMMENTS = "cache:set:comments";
    constexpr const char* SEARCH_USERS = "cache:set:search:users";
}

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
                "WHERE p.user_id = ANY("
                "  COALESCE((SELECT following FROM users WHERE id = $1::uuid), '{}'::UUID[])"
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

std::string vectorToPgArray(const std::vector<float>& vec) {
    if (vec.empty()) return "[]";
    std::string result = "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        if (i > 0) result += ",";
        result += std::to_string(vec[i]);
    }
    result += "]";
    return result;
}

std::optional<Post> CommunityService::createPost(const Post& post) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // Construir texto para embedding
        std::string tagsText;
        for (size_t i = 0; i < post.tags.size(); ++i) {
            if (i > 0) tagsText += " ";
            tagsText += post.tags[i];
        }
        std::string textToEmbed = post.title + " " + post.content + " " + tagsText;
        std::vector<float> embedding = generateEmbedding(textToEmbed);
        
        // Subir imagen si es base64
        std::string finalImageUrl;
        if (!post.imageUrl.empty()) {
            if (post.imageUrl.find("data:image") == 0 || 
                post.imageUrl.find("/9j/") == 0 || 
                post.imageUrl.size() > 500) {
                std::cout << "[Image] Uploading base64 image..." << std::endl;
                finalImageUrl = uploadImageToCloudinary(post.imageUrl, "yung-accountant/posts/pictures", "");
                std::cout << "[Image] Uploaded: " << finalImageUrl << std::endl;
            } else {
                finalImageUrl = post.imageUrl;
            }
        }
        
        pqxx::result result;
        
        // Construir consulta base
        std::string query = "INSERT INTO posts (user_id, title, content, tags";
        std::string values = "VALUES ($1, $2, $3, $4";
        int paramCount = 4;
        
        // Agregar embedding si existe
        if (!embedding.empty()) {
            query += ", embedding";
            values += ", $" + std::to_string(++paramCount);
        }
        
        // Agregar image_url si existe
        if (!finalImageUrl.empty()) {
            query += ", image_url";
            values += ", $" + std::to_string(++paramCount);
        }
        
        query += ") " + values + ") RETURNING id, created_at, updated_at";
        
        // Preparar parámetros
        if (!embedding.empty() && !finalImageUrl.empty()) {
            result = txn.exec_params(
                query,
                post.userId,
                post.title, 
                post.content,
                post.tags,  // pqxx::to_string se aplica automáticamente a std::vector<std::string>
                vectorToPgArray(embedding),  // Vector de floats a string de PostgreSQL
                finalImageUrl
            );
        } else if (!embedding.empty()) {
            result = txn.exec_params(
                query,
                post.userId,
                post.title,
                post.content,
                post.tags,
                vectorToPgArray(embedding)
            );
        } else if (!finalImageUrl.empty()) {
            result = txn.exec_params(
                query,
                post.userId,
                post.title,
                post.content,
                post.tags,
                finalImageUrl
            );
        } else {
            result = txn.exec_params(
                query,
                post.userId,
                post.title,
                post.content,
                post.tags
            );
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
            invalidatePersonalizedFeedCache(post.userId);
            invalidateTrendingCache();
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


bool CommunityService::updatePost(const std::string& id, const std::string& userId, 
                                  const boost::json::object& updates) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        std::vector<std::string> setClauses;
        std::vector<std::string> paramValues;
        
        std::string newTitle, newContent;
        std::vector<std::string> newTags;
        std::string newImageUrl, oldImageUrl;
        bool contentChanged = false;
        bool imageChanged = false;
        
        // Si viene imageUrl, obtener la URL anterior ANTES de modificar
        if (updates.contains("imageUrl")) {
            auto imgResult = txn.exec_params(
                "SELECT image_url FROM posts WHERE id = $1", id);
            if (!imgResult.empty() && !imgResult[0]["image_url"].is_null()) {
                oldImageUrl = imgResult[0]["image_url"].as<std::string>();
            }
        }
        
        // Preparar clausulas SET
        if (updates.contains("title")) {
            newTitle = std::string(updates.at("title").as_string());
            setClauses.push_back("title = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(newTitle);
            contentChanged = true;
        }
        
        if (updates.contains("content")) {
            newContent = std::string(updates.at("content").as_string());
            setClauses.push_back("content = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(newContent);
            contentChanged = true;
        }
        
        if (updates.contains("tags")) {
            const auto& arr = updates.at("tags").as_array();
            for (const auto& tag : arr) {
                newTags.push_back(std::string(tag.as_string()));
            }
            setClauses.push_back("tags = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(pqxx::to_string(newTags));
            contentChanged = true;
        }
        
        if (updates.contains("imageUrl")) {
            std::string rawImage = std::string(updates.at("imageUrl").as_string());
            
            // Si es base64, subir a Cloudinary
            if (!rawImage.empty() && 
                (rawImage.find("data:image") == 0 || 
                 rawImage.find("/9j/") == 0 || 
                 rawImage.size() > 500)) {
                
                // Extraer public_id de la imagen anterior para sobrescribirla
                std::string oldPublicId;
                if (!oldImageUrl.empty()) {
                    oldPublicId = extractPublicIdFromUrl(oldImageUrl);
                }
                
                std::cout << "[Image] Uploading base64 image (overwrite=" 
                          << (!oldPublicId.empty() ? "true" : "false") << ")..." << std::endl;
                
                newImageUrl = uploadImageToCloudinary(
                    rawImage, 
                    "yung-accountant/posts/pictures",
                    oldPublicId  // Sobrescribe la imagen anterior si existe
                );
                
                if (newImageUrl.empty()) {
                    std::cerr << "[Image] Upload failed, keeping old image URL" << std::endl;
                    // No marcar imageChanged si fallo la subida
                } else {
                    std::cout << "[Image] Uploaded: " << newImageUrl << std::endl;
                    imageChanged = true;
                }
            } else if (!rawImage.empty()) {
                // Es una URL ya existente de Cloudinary
                newImageUrl = rawImage;
                imageChanged = (newImageUrl != oldImageUrl);
            }
            
            if (imageChanged && !newImageUrl.empty()) {
                setClauses.push_back("image_url = $" + std::to_string(paramValues.size() + 1));
                paramValues.push_back(newImageUrl);
            }
        }
        
        // Regenerar embedding si el contenido cambio
        if (contentChanged) {
            if (!updates.contains("title") || !updates.contains("content") || !updates.contains("tags")) {
                auto currentPost = txn.exec_params(
                    "SELECT title, content, tags FROM posts WHERE id = $1", id);
                if (!currentPost.empty()) {
                    if (!updates.contains("title")) 
                        newTitle = currentPost[0]["title"].as<std::string>();
                    if (!updates.contains("content")) 
                        newContent = currentPost[0]["content"].as<std::string>();
                    if (!updates.contains("tags")) {
                        std::string tagsStr = currentPost[0]["tags"].as<std::string>();
                        newTags = parsePostgresArray(tagsStr);
                    }
                }
            }
            
            std::string tagsText;
            for (const auto& t : newTags) {
                if (!tagsText.empty()) tagsText += " ";
                tagsText += t;
            }
            std::string textToEmbed = newTitle + " " + newContent + " " + tagsText;
            std::vector<float> embedding = generateEmbedding(textToEmbed);
            
            if (!embedding.empty()) {
                setClauses.push_back("embedding = $" + std::to_string(paramValues.size() + 1));
                paramValues.push_back(vectorToPgArray(embedding));
            }
        }
        
        if (setClauses.empty()) return false;
        
        // Construir consulta final
        std::string query = "UPDATE posts SET ";
        for (size_t i = 0; i < setClauses.size(); ++i) {
            if (i > 0) query += ", ";
            query += setClauses[i];
        }
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = $" + 
                 std::to_string(paramValues.size() + 1) + 
                 " AND user_id = $" + std::to_string(paramValues.size() + 2);
        
        paramValues.push_back(id);
        paramValues.push_back(userId);
        
        // Ejecutar consulta con parametros posicionales
        pqxx::result result;
        switch (paramValues.size()) {
            case 2: result = txn.exec_params(query, paramValues[0], paramValues[1]); break;
            case 3: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2]); break;
            case 4: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3]); break;
            case 5: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4]); break;
            case 6: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5]); break;
            case 7: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6]); break;
            default:
                std::cerr << "Too many parameters: " << paramValues.size() << std::endl;
                return false;
        }
        
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidatePostsListCache();
            invalidateSearchCaches();
            invalidateTrendingCache();
            invalidatePersonalizedFeedCache(userId);
            
            std::cout << "✓ Post updated: " << id << std::endl;
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
        
        // Cambiado: '{}'::UUID[] en lugar de '{}'
        auto checkResult = txn.exec_params(
            "SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1 AND $2::uuid = ANY(COALESCE(liked_by, '{}'::UUID[]))) as already_liked",
            postId, userId);
        
        if (checkResult.empty()) return false;
        
        bool alreadyLiked = checkResult[0]["already_liked"].as<bool>();
        
        if (alreadyLiked) {
            // Cambiado: '{}'::UUID[] en lugar de '{}'
            txn.exec_params(
                "UPDATE posts SET liked_by = array_remove(COALESCE(liked_by, '{}'::UUID[]), $1::uuid), "
                "likes_count = likes_count - 1 WHERE id = $2", 
                userId, postId);
        } else {
            // Cambiado: '{}'::UUID[] en lugar de '{}'
            txn.exec_params(
                "UPDATE posts SET liked_by = array_append(COALESCE(liked_by, '{}'::UUID[]), $1::uuid), "
                "likes_count = likes_count + 1 WHERE id = $2", 
                userId, postId);
        }
        
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
                    c.replies = getRepliesWithConn(conn, c.id);
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
    PoolConnection pooled_conn;
    return getRepliesWithConn(pooled_conn.get(), parentId);
}

std::vector<Comment> CommunityService::getRepliesWithConn(pqxx::connection& conn, const std::string& parentId) {
    std::vector<Comment> replies;
    try {
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT c.*, u.username, u.display_name, u.profile_pic as avatar "
            "FROM comments c JOIN users u ON c.user_id = u.id "
            "WHERE c.parent_id = $1 ORDER BY c.created_at ASC", parentId);
        txn.commit();
        
        for (const auto& row : result) {
            Comment c = rowToComment(row);
            c.username = row["username"].as<std::string>();
            c.displayName = row["display_name"].as<std::string>();
            c.avatar = row["avatar"].is_null() ? "" : row["avatar"].as<std::string>();
            replies.push_back(c);
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
        
        // Cambiado: '{}'::UUID[] en lugar de '{}'
        auto checkResult = txn.exec_params(
            "SELECT EXISTS(SELECT 1 FROM comments WHERE id = $1 AND $2::uuid = ANY(COALESCE(liked_by, '{}'::UUID[]))) as already_liked, "
            "post_id FROM comments WHERE id = $1",
            commentId, userId);
        
        if (checkResult.empty()) return false;
        
        bool alreadyLiked = checkResult[0]["already_liked"].as<bool>();
        std::string postId = checkResult[0]["post_id"].as<std::string>();
        
        if (alreadyLiked) {
            // Cambiado: '{}'::UUID[] en lugar de '{}'
            txn.exec_params(
                "UPDATE comments SET liked_by = array_remove(COALESCE(liked_by, '{}'::UUID[]), $1::uuid), "
                "likes_count = likes_count - 1 WHERE id = $2", 
                userId, commentId);
        } else {
            // Cambiado: '{}'::UUID[] en lugar de '{}'
            txn.exec_params(
                "UPDATE comments SET liked_by = array_append(COALESCE(liked_by, '{}'::UUID[]), $1::uuid), "
                "likes_count = likes_count + 1 WHERE id = $2", 
                userId, commentId);
        }
        txn.commit();
        
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
            cacheWithTracking(cacheKey, postsToJson(posts), CacheSets::PERSONALIZED_FEED, 120);
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
        }
    } catch (const std::exception& e) {
        std::cerr << "Redis error in getRecommendedUsers: " << e.what() << std::endl;
    }
    
    // Obtener de PostgreSQL (UNA sola conexión)
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        
        if (!conn.is_open()) {
            std::cerr << "Database connection is closed!" << std::endl;
            return users;
        }
        
        // Usar la versión interna que reutiliza la conexión
        users = getRecommendedUsersWithConn(conn, limit, currentUserId);
        
        std::cout << "[RECOMMENDED USERS] Found " << users.size() << " users" << std::endl;
        
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
        std::cerr << "Database connection broken: " << e.what() << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error getting recommended users: " << e.what() << std::endl;
    }
    
    return users;
}

std::vector<UserSearchResult> CommunityService::getRecommendedUsersWithConn(
    pqxx::connection& conn, 
    int limit, 
    const std::string& currentUserId
) {
    std::vector<UserSearchResult> users;
    
    try {
        pqxx::work txn(conn);
        pqxx::result result;
        
        if (!currentUserId.empty()) {
            // ✅ CORREGIDO: Usar uuid directo sin conversión text
            result = txn.exec_params(
                "SELECT u.id, u.username, u.display_name, u.profile_pic as avatar, u.bio, "
                "COALESCE(cardinality(u.followers), 0) as followers_count, "
                "COALESCE((SELECT COUNT(*) FROM posts WHERE user_id = u.id), 0) as posts_count "
                "FROM users u "
                "WHERE u.id != $1::uuid "
                "AND u.id != ALL(COALESCE("
                "  (SELECT following FROM users WHERE id = $1::uuid), "
                "  '{}'::UUID[]"
                ")) "
                "ORDER BY followers_count DESC, posts_count DESC "
                "LIMIT $2",
                currentUserId, limit);
        } else {
            result = txn.exec_params(
                "SELECT u.id, u.username, u.display_name, u.profile_pic as avatar, u.bio, "
                "COALESCE(cardinality(u.followers), 0) as followers_count, "
                "COALESCE((SELECT COUNT(*) FROM posts WHERE user_id = u.id), 0) as posts_count "
                "FROM users u "
                "ORDER BY followers_count DESC, posts_count DESC "
                "LIMIT $1",
                limit);
        }
        txn.commit();
        
        for (const auto& row : result) {
            users.push_back(rowToUserSearchResult(row));
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error in getRecommendedUsersWithConn: " << e.what() << std::endl;
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
        
        // Usar la versión interna
        posts = getTrendingPostsWithConn(conn, limit);
        
        if (redis.isConnected() && !posts.empty()) {
            cacheWithTracking(cacheKey, postsToJson(posts), CacheSets::PERSONALIZED_FEED, 120);
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error getting trending posts: " << e.what() << std::endl;
    }
    return posts;
}

std::vector<Post> CommunityService::getTrendingPostsWithConn(
    pqxx::connection& conn, 
    int limit
) {
    std::vector<Post> posts;
    
    try {
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
        
    } catch (const std::exception& e) {
        std::cerr << "Error in getTrendingPostsWithConn: " << e.what() << std::endl;
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
        
        // Usar la versión interna
        users = getTrendingUsersWithConn(conn, limit);
        
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

std::vector<UserSearchResult> CommunityService::getTrendingUsersWithConn(
    pqxx::connection& conn, 
    int limit
) {
    std::vector<UserSearchResult> users;
    
    try {
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT u.id, u.username, u.display_name, u.profile_pic as avatar, u.bio, "
            "COALESCE(array_length(u.followers, 1), 0) as followers_count, "
            "COALESCE((SELECT COUNT(*) FROM posts WHERE user_id = u.id), 0) as posts_count, "
            "COALESCE((SELECT COUNT(*) FROM posts WHERE user_id = u.id AND created_at > NOW() - INTERVAL '7 days'), 0) as recent_posts "
            "FROM users u "
            "ORDER BY recent_posts DESC, followers_count DESC "
            "LIMIT $1", limit);
        txn.commit();
        
        for (const auto& row : result) {
            users.push_back(rowToUserSearchResult(row));
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error in getTrendingUsersWithConn: " << e.what() << std::endl;
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
        
        // Cambiado: $1::uuid en lugar de $1::text
        // Cambiado: '{}'::UUID[] en lugar de '{}'
        txn.exec_params(
            "UPDATE users SET following = array_append(COALESCE(following, '{}'::UUID[]), $1::uuid) "
            "WHERE id = $2::uuid AND NOT ($1::uuid = ANY(COALESCE(following, '{}'::UUID[])))",
            targetUserId, followerId);
        
        txn.exec_params(
            "UPDATE users SET followers = array_append(COALESCE(followers, '{}'::UUID[]), $1::uuid) "
            "WHERE id = $2::uuid AND NOT ($1::uuid = ANY(COALESCE(followers, '{}'::UUID[])))",
            followerId, targetUserId);
        
        txn.commit();
        
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
        
        // Cambiado: $1::uuid en lugar de $1::text
        // Cambiado: '{}'::UUID[] en lugar de '{}'
        txn.exec_params(
            "UPDATE users SET following = array_remove(COALESCE(following, '{}'::UUID[]), $1::uuid) "
            "WHERE id = $2::uuid", 
            targetUserId, followerId);
        
        txn.exec_params(
            "UPDATE users SET followers = array_remove(COALESCE(followers, '{}'::UUID[]), $1::uuid) "
            "WHERE id = $2::uuid", 
            followerId, targetUserId);
        
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
        
        // Cambiado: $1::uuid en lugar de $1::text
        // Cambiado: '{}'::UUID[] en lugar de '{}'
        auto result = txn.exec_params(
            "SELECT $1::uuid = ANY(COALESCE(following, '{}'::UUID[])) as is_following "
            "FROM users WHERE id = $2::uuid",
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
            cacheWithTracking(cacheKey, postsToJson(posts), CacheSets::PERSONALIZED_FEED, 120);
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
// MÉTODO AUXILIAR: Cachear con tracking
// ============================================
void CommunityService::cacheWithTracking(const std::string& key, const std::string& value, 
                       const std::string& setKey, int ttl) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (redis.set(key, value, ttl)) {
        redis.sadd(setKey, key);
    }
}

// ============================================
// MÉTODO AUXILIAR: Invalidar por SET (con fallback SCAN)
// ============================================
void invalidateBySet(const std::string& setKey, const std::string& pattern = "") {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    // Intento principal: borrar usando SET
    bool success = redis.delSet(setKey);
    
    // Fallback: si falla el SET, usar SCAN
    if (!success && !pattern.empty()) {
        std::cerr << "[Cache] SET '" << setKey << "' not found, using SCAN fallback" << std::endl;
        redis.delByPattern(pattern);
    }
}

// ============================================
// CACHÉ DE POSTS
// ============================================
void CommunityService::cachePostsList(int page, int limit, const std::vector<Post>& posts) {
    std::string key = "community:posts:list:" + std::to_string(page) + ":" + std::to_string(limit);
    cacheWithTracking(key, postsToJson(posts), CacheSets::POSTS_LIST, 300);
}

void CommunityService::invalidatePostsListCache() {
    invalidateBySet(CacheSets::POSTS_LIST, "community:posts:list:*");
}

std::optional<std::vector<Post>> CommunityService::getCachedPostsList(int page, int limit) {
    std::shared_lock lock(cache_mutex_);
    
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

// ============================================
// CACHÉ DE BÚSQUEDA
// ============================================
void CommunityService::invalidateSearchCaches() {
    invalidateBySet(CacheSets::SEARCH_POSTS, "community:search:posts:*");
    invalidateBySet(CacheSets::SEARCH_TAGS, "community:tags:*");
    invalidateBySet(CacheSets::RECOMMENDED_POSTS, "community:recommended:*");
}

// ============================================
// CACHÉ DE TENDENCIAS
// ============================================
void CommunityService::invalidateTrendingCache() {
    invalidateBySet(CacheSets::TRENDING_POSTS, "community:trending:posts:*");
    invalidateBySet(CacheSets::TRENDING_USERS, "community:users:trending:*");
}

// ============================================
// CACHÉ DE COMENTARIOS
// ============================================
void CommunityService::invalidateCommentsCache(const std::string& postId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    std::string key = "community:comments:" + postId;
    redis.del(key);
    redis.srem(CacheSets::COMMENTS, key);
}

// ============================================
// CACHÉ DE FEED PERSONALIZADO
// ============================================
void CommunityService::invalidatePersonalizedFeedCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    // Método eficiente: filtrar miembros del SET que contengan el userId
    auto members = redis.smembers(CacheSets::PERSONALIZED_FEED);
    for (const auto& key : members) {
        if (key.find(":" + userId + ":") != std::string::npos || 
            key.find(":" + userId) == key.size() - userId.size()) {
            redis.del(key);
            redis.srem(CacheSets::PERSONALIZED_FEED, key);
        }
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

std::string CommunityService::uploadImageToCloudinary(
    const std::string& base64Image, 
    const std::string& folder,
    const std::string& publicId)
{
    try {
        std::string cloudName = std::getenv("CLOUDINARY_CLOUD_NAME") ? 
            std::getenv("CLOUDINARY_CLOUD_NAME") : "";
        std::string apiKey = std::getenv("CLOUDINARY_API_KEY") ? 
            std::getenv("CLOUDINARY_API_KEY") : "";
        std::string apiSecret = std::getenv("CLOUDINARY_API_SECRET") ? 
            std::getenv("CLOUDINARY_API_SECRET") : "";
        
        if (apiKey.empty() || apiSecret.empty()) {
            std::cerr << "[Cloudinary] Missing API credentials" << std::endl;
            return "";
        }
        
        long long timestamp = std::time(nullptr);
        
        // Construir firma incluyendo public_id y overwrite si existen
        std::string toSign = "folder=" + folder;
        if (!publicId.empty()) {
            toSign += "&public_id=" + publicId + "&overwrite=true";
        }
        toSign += "&timestamp=" + std::to_string(timestamp) + apiSecret;
        
        std::string signature = generateCloudinarySignature(toSign);
        
        if (signature.empty()) {
            std::cerr << "[Cloudinary] Failed to generate signature" << std::endl;
            return "";
        }
        
        std::string uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload";
        
        CURL* curl = curl_easy_init();
        if (!curl) return "";
        
        curl_mime* mime = curl_mime_init(curl);
        curl_mimepart* part;
        
        // Imagen
        part = curl_mime_addpart(mime);
        curl_mime_name(part, "file");
        curl_mime_data(part, base64Image.c_str(), base64Image.size());
        curl_mime_filename(part, "post.jpg");
        
        // API Key
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
        curl_mime_data(part, signature.c_str(), CURL_ZERO_TERMINATED);
        
        // Signature algorithm
        part = curl_mime_addpart(mime);
        curl_mime_name(part, "signature_algorithm");
        curl_mime_data(part, "sha256", CURL_ZERO_TERMINATED);
        
        // Folder
        part = curl_mime_addpart(mime);
        curl_mime_name(part, "folder");
        curl_mime_data(part, folder.c_str(), CURL_ZERO_TERMINATED);
        
        // Public ID (para sobrescribir imagen existente)
        if (!publicId.empty()) {
            part = curl_mime_addpart(mime);
            curl_mime_name(part, "public_id");
            curl_mime_data(part, publicId.c_str(), CURL_ZERO_TERMINATED);
            
            part = curl_mime_addpart(mime);
            curl_mime_name(part, "overwrite");
            curl_mime_data(part, "true", CURL_ZERO_TERMINATED);
        }
        
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
                std::cout << "[Cloudinary] Upload success with SHA256" 
                          << (publicId.empty() ? "" : " (overwrite)") << std::endl;
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

std::string CommunityService::extractPublicIdFromUrl(const std::string& imageUrl) {
    if (imageUrl.find("cloudinary.com") == std::string::npos) return "";
    
    // Formato: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{filename}.{ext}
    size_t uploadPos = imageUrl.find("/upload/");
    if (uploadPos == std::string::npos) return "";
    
    // Saltar "/upload/"
    size_t versionStart = imageUrl.find("/v", uploadPos + 8);
    if (versionStart == std::string::npos) return "";
    
    // Saltar "/v1234567890/"
    size_t idStart = imageUrl.find("/", versionStart + 2);
    if (idStart == std::string::npos) return "";
    idStart++;  // Saltar la barra
    
    // Encontrar la extension
    size_t idEnd = imageUrl.find_last_of(".");
    if (idEnd == std::string::npos) return "";
    
    return imageUrl.substr(idStart, idEnd - idStart);
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
    
    std::string cloudName = std::getenv("CLOUDINARY_CLOUD_NAME") ? 
        std::getenv("CLOUDINARY_CLOUD_NAME") : "";
    std::string apiKey = std::getenv("CLOUDINARY_API_KEY") ? 
        std::getenv("CLOUDINARY_API_KEY") : "";
    std::string apiSecret = std::getenv("CLOUDINARY_API_SECRET") ? 
        std::getenv("CLOUDINARY_API_SECRET") : "";
    
    if (apiKey.empty() || apiSecret.empty()) return;
    
    long long timestamp = std::time(nullptr);
    
    // CAMBIADO: SHA256 en lugar de SHA1
    std::string toSign = "public_id=" + publicId + "&timestamp=" + 
                        std::to_string(timestamp) + apiSecret;
    std::string signature = generateCloudinarySignature(toSign);
    
    std::string deleteUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/destroy";
    
    // Agregar signature_algorithm=sha256 al body
    std::string deleteBody = "public_id=" + publicId + 
                            "&timestamp=" + std::to_string(timestamp) + 
                            "&api_key=" + apiKey + 
                            "&signature=" + signature +
                            "&signature_algorithm=sha256";  // ← NUEVO
    
    CURL* curl = curl_easy_init();
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, deleteUrl.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, deleteBody.c_str());
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);
        curl_easy_perform(curl);
        curl_easy_cleanup(curl);
        
        std::cout << "[Cloudinary] Deleted image with SHA256: " 
                  << publicId << std::endl;
    }
}

std::string CommunityService::generateCloudinarySignature(const std::string& toSign) {
    unsigned char hash[EVP_MAX_MD_SIZE];
    unsigned int hashLen = 0;
    
    // Usar EVP_Digest (API moderna de OpenSSL)
    EVP_MD_CTX* ctx = EVP_MD_CTX_new();
    if (!ctx) {
        std::cerr << "[Cloudinary] Failed to create EVP_MD_CTX" << std::endl;
        return "";
    }
    
    if (EVP_DigestInit_ex(ctx, EVP_sha256(), nullptr) != 1 ||
        EVP_DigestUpdate(ctx, toSign.c_str(), toSign.size()) != 1 ||
        EVP_DigestFinal_ex(ctx, hash, &hashLen) != 1) {
        std::cerr << "[Cloudinary] SHA256 digest failed" << std::endl;
        EVP_MD_CTX_free(ctx);
        return "";
    }
    
    EVP_MD_CTX_free(ctx);
    
    // Convertir a hexadecimal
    std::stringstream signature;
    for (unsigned int i = 0; i < hashLen; i++) {
        signature << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    
    return signature.str();
}


std::vector<std::string> CommunityService::parsePostgresArray(const std::string& pgArray) {
    std::vector<std::string> result;
    
    if (pgArray.empty() || pgArray == "{}") {
        return result;
    }
    
    // Remover llaves externas
    std::string content = pgArray.substr(1, pgArray.size() - 2);
    
    if (content.empty()) {
        return result;
    }
    
    // Parsear elementos separados por comas, respetando comillas
    bool inQuotes = false;
    std::string current;
    
    for (size_t i = 0; i < content.size(); ++i) {
        char c = content[i];
        
        if (c == '"') {
            inQuotes = !inQuotes;
        } else if (c == ',' && !inQuotes) {
            // Remover comillas del elemento
            if (!current.empty() && current.front() == '"' && current.back() == '"') {
                current = current.substr(1, current.size() - 2);
            }
            result.push_back(current);
            current.clear();
        } else {
            current += c;
        }
    }
    
    // Último elemento
    if (!current.empty()) {
        if (current.front() == '"' && current.back() == '"') {
            current = current.substr(1, current.size() - 2);
        }
        result.push_back(current);
    }
    
    return result;
}
