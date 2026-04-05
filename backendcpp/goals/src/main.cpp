#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <iomanip>
#include <sstream> 
#include <memory>
#include <ctime>
#include "goal_service.hpp"
#include "database.hpp"
#include "auth_middleware.hpp"
#include "keycloak_auth.hpp"
#include "kafka_producer.hpp"

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
namespace json = boost::json;
using tcp = net::ip::tcp;

std::unique_ptr<keycloak::KeycloakClient> keycloak_client;

std::string formatNumber(double value) {
    std::stringstream ss;
    ss << std::fixed << std::setprecision(2);
    ss << value;
    return ss.str();
}

// ============================================
// FUNCIÓN PARA EMITIR EVENTOS A KAFKA
// ============================================
void emitGoalEvent(const std::string& event_type, 
                   const std::string& user_id,
                   const std::string& goal_id,
                   int status_code,
                   const boost::json::object& extra_data = {}) {
    try {
        boost::json::object event;
        event["type"] = event_type;
        event["service"] = "goals";
        event["user_id"] = user_id;
        event["goal_id"] = goal_id;
        event["timestamp"] = std::time(nullptr);
        event["status_code"] = status_code;
        
        for (const auto& [key, value] : extra_data) {
            event[key] = value;
        }
        
        kafka::getProducer().produce("goal-events", event);
        
        if (status_code >= 200 && status_code < 300) {
            std::cout << "[Kafka] Event emitted: " << event_type << " (SUCCESS) for goal: " << goal_id << std::endl;
        } else {
            std::cout << "[Kafka] Event emitted: " << event_type << " (FAILED) for goal: " << goal_id << std::endl;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "[Kafka] Error emitting event: " << e.what() << std::endl;
    }
}

class HttpSession : public std::enable_shared_from_this<HttpSession> {
    tcp::socket socket_;
    beast::flat_buffer buffer_;
    http::request<http::string_body> req_;
    
public:
    explicit HttpSession(tcp::socket&& socket) : socket_(std::move(socket)) {}
    
    void run() { read_request(); }
    
private:
    void read_request() {
        auto self = shared_from_this();
        http::async_read(socket_, buffer_, req_,
            [self](beast::error_code ec, std::size_t) {
                if (!ec) self->handle_request();
            });
    }
    
    void handle_request() {
        http::response<http::string_body> res{http::status::ok, req_.version()};
        res.set(http::field::server, "Goals Service");
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string target(req_.target().begin(), req_.target().end());
            
            // Health check
            if (req_.method() == http::verb::get && target == "/health") {
                json::object response;
                response["status"] = "ok";
                response["service"] = "goals-service";
                res.body() = json::serialize(response);
            }
            // ============================================
            // GOAL ENDPOINTS
            // ============================================
            // GET /goals
            else if (req_.method() == http::verb::get && target == "/goals") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("list_goals_failed", user_info.mongoId, "", status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto goals = GoalService::getInstance().getGoalsByUser(user_info.mongoId);
                    json::array arr;
                    for (const auto& g : goals) {
                        json::object obj;
                        obj["id"] = g.id;
                        obj["title"] = g.title;
                        obj["description"] = g.description;
                        obj["target_amount"] = formatNumber(g.target_amount);
                        obj["current_amount"] = formatNumber(g.current_amount);
                        obj["progress_percentage"] = formatNumber((g.target_amount > 0) ? (g.current_amount / g.target_amount) * 100.0 : 0.0);
                        obj["created_at"] = g.created_at;
                        arr.push_back(obj);
                    }
                    res.body() = json::serialize(arr);
                    emitGoalEvent("list_goals_success", user_info.mongoId, "", 200,
                                 {{"count", (int)goals.size()}});
                }
            }
            // POST /goals
            else if (req_.method() == http::verb::post && target == "/goals") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("goal_creation_failed", user_info.mongoId, "", status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    try {
                        json::value jv = json::parse(req_.body());
                        json::object& obj = jv.as_object();
                        
                        Goal goal;
                        goal.user_id = user_info.mongoId;
                        goal.title = std::string(obj.at("title").as_string());
                        goal.description = obj.contains("description") ? std::string(obj.at("description").as_string()) : "";
                        
                        if (obj.at("target_amount").is_double()) {
                            goal.target_amount = obj.at("target_amount").as_double();
                        } else if (obj.at("target_amount").is_int64()) {
                            goal.target_amount = static_cast<double>(obj.at("target_amount").as_int64());
                        } else {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "target_amount debe ser un número";
                            res.body() = json::serialize(error);
                            emitGoalEvent("goal_creation_failed", user_info.mongoId, "", status_code,
                                         {{"reason", "invalid_target_amount"}});
                            return;
                        }
                        
                        goal.current_amount = 0.0;
                        
                        auto t = std::time(nullptr);
                        goal.created_at = std::ctime(&t);
                        goal.created_at.pop_back();
                        
                        std::string goal_id;
                        bool success = GoalService::getInstance().createGoal(goal, goal_id);
                        
                        if (success) {
                            int status_code = static_cast<int>(http::status::ok);
                            res.result(status_code);
                            json::object response;
                            response["message"] = "Meta creada exitosamente";
                            response["goal_id"] = goal_id;
                            res.body() = json::serialize(response);
                            
                            boost::json::object extra;
                            extra["title"] = goal.title;
                            extra["target_amount"] = goal.target_amount;
                            emitGoalEvent("goal_created", user_info.mongoId, goal_id, status_code, extra);
                        } else {
                            int status_code = static_cast<int>(http::status::internal_server_error);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Error al crear la meta";
                            res.body() = json::serialize(error);
                            emitGoalEvent("goal_creation_failed", user_info.mongoId, "", status_code,
                                         {{"reason", "database_error"}});
                        }
                    } catch (const std::exception& e) {
                        int status_code = static_cast<int>(http::status::bad_request);
                        res.result(status_code);
                        json::object error;
                        error["error"] = e.what();
                        res.body() = json::serialize(error);
                        emitGoalEvent("goal_creation_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "invalid_json"}, {"error", e.what()}});
                    }
                }
            }
            // GET /goals/{id}
            else if (req_.method() == http::verb::get && target.find("/goals/") == 0 && target != "/goals" && target.find("/days") == std::string::npos) {
                std::string id = target.substr(7);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("get_goal_failed", user_info.mongoId, id, status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto goal = GoalService::getInstance().getGoal(id);
                    if (goal && goal->user_id == user_info.mongoId) {
                        json::object obj;
                        obj["id"] = goal->id;
                        obj["title"] = goal->title;
                        obj["description"] = goal->description;
                        obj["target_amount"] = formatNumber(goal->target_amount);
                        obj["current_amount"] = formatNumber(goal->current_amount);
                        obj["progress_percentage"] = formatNumber((goal->target_amount > 0) ? (goal->current_amount / goal->target_amount) * 100.0 : 0.0);
                        obj["created_at"] = goal->created_at;
                        res.body() = json::serialize(obj);
                        emitGoalEvent("get_goal_success", user_info.mongoId, id, 200);
                    } else {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Meta no encontrada";
                        res.body() = json::serialize(error);
                        emitGoalEvent("get_goal_failed", user_info.mongoId, id, status_code,
                                     {{"reason", "goal_not_found"}});
                    }
                }
            }
            // PUT /goals/{id}
            else if (req_.method() == http::verb::put && target.find("/goals/") == 0 && target != "/goals" && target.find("/days") == std::string::npos) {
                std::string id = target.substr(7);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("goal_update_failed", user_info.mongoId, id, status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto goal = GoalService::getInstance().getGoal(id);
                    if (!goal || goal->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para modificar esta meta");
                        emitGoalEvent("goal_update_failed", user_info.mongoId, id, status_code,
                                     {{"reason", "permission_denied"}});
                    } else {
                        try {
                            json::value jv = json::parse(req_.body());
                            json::object& obj = jv.as_object();
                            
                            std::string title = std::string(obj.at("title").as_string());
                            std::string description = obj.contains("description") ? std::string(obj.at("description").as_string()) : "";
                            double target = 0.0;
                            
                            if (obj.at("target_amount").is_double()) {
                                target = obj.at("target_amount").as_double();
                            } else if (obj.at("target_amount").is_int64()) {
                                target = static_cast<double>(obj.at("target_amount").as_int64());
                            } else {
                                int status_code = static_cast<int>(http::status::bad_request);
                                res.result(status_code);
                                json::object error;
                                error["error"] = "target_amount debe ser un número";
                                res.body() = json::serialize(error);
                                emitGoalEvent("goal_update_failed", user_info.mongoId, id, status_code,
                                             {{"reason", "invalid_target_amount"}});
                                return;
                            }
                            
                            bool success = GoalService::getInstance().updateGoal(id, title, description, target);
                            
                            if (success) {
                                int status_code = static_cast<int>(http::status::ok);
                                json::object response;
                                response["message"] = "Meta actualizada exitosamente";
                                res.body() = json::serialize(response);
                                
                                boost::json::object extra;
                                extra["old_title"] = goal->title;
                                extra["old_target_amount"] = goal->target_amount;
                                extra["new_title"] = title;
                                extra["new_target_amount"] = target;
                                emitGoalEvent("goal_updated", user_info.mongoId, id, status_code, extra);
                            } else {
                                int status_code = static_cast<int>(http::status::not_found);
                                res.result(status_code);
                                json::object error;
                                error["error"] = "Meta no encontrada";
                                res.body() = json::serialize(error);
                                emitGoalEvent("goal_update_failed", user_info.mongoId, id, status_code,
                                             {{"reason", "goal_not_found"}});
                            }
                        } catch (const std::exception& e) {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = e.what();
                            res.body() = json::serialize(error);
                            emitGoalEvent("goal_update_failed", user_info.mongoId, id, status_code,
                                         {{"reason", "invalid_json"}, {"error", e.what()}});
                        }
                    }
                }
            }
            // DELETE /goals/{id}
            else if (req_.method() == http::verb::delete_ && target.find("/goals/") == 0 && target != "/goals" && target.find("/days") == std::string::npos) {
                std::string id = target.substr(7);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("goal_deletion_failed", user_info.mongoId, id, status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto goal = GoalService::getInstance().getGoal(id);
                    if (!goal || goal->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para eliminar esta meta");
                        emitGoalEvent("goal_deletion_failed", user_info.mongoId, id, status_code,
                                     {{"reason", "permission_denied"}});
                    } else {
                        boost::json::object extra;
                        extra["title"] = goal->title;
                        extra["target_amount"] = goal->target_amount;
                        extra["current_amount"] = goal->current_amount;
                        
                        bool success = GoalService::getInstance().deleteGoal(id);
                        
                        if (success) {
                            int status_code = static_cast<int>(http::status::ok);
                            json::object response;
                            response["message"] = "Meta eliminada exitosamente";
                            res.body() = json::serialize(response);
                            emitGoalEvent("goal_deleted", user_info.mongoId, id, status_code, extra);
                        } else {
                            int status_code = static_cast<int>(http::status::not_found);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Meta no encontrada";
                            res.body() = json::serialize(error);
                            emitGoalEvent("goal_deletion_failed", user_info.mongoId, id, status_code,
                                         {{"reason", "goal_not_found"}});
                        }
                    }
                }
            }
            // ============================================
            // DAY ENDPOINTS
            // ============================================
            // GET /goals/{goal_id}/days
            else if (req_.method() == http::verb::get && target.find("/goals/") == 0 && target.find("/days") != std::string::npos && target.find("/events") == std::string::npos) {
                std::string goal_id = target.substr(7, target.find("/days") - 7);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("list_days_failed", user_info.mongoId, goal_id, status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto goal = GoalService::getInstance().getGoal(goal_id);
                    if (!goal || goal->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para ver estos días");
                        emitGoalEvent("list_days_failed", user_info.mongoId, goal_id, status_code,
                                     {{"reason", "permission_denied"}});
                    } else {
                        auto days = GoalService::getInstance().getDaysByGoal(goal_id);
                        json::array arr;
                        for (const auto& d : days) {
                            json::object obj;
                            obj["id"] = d.id;
                            obj["date"] = d.date;
                            obj["total_amount"] = formatNumber(GoalService::getInstance().getDayTotal(d.id));
                            obj["created_at"] = d.created_at;
                            arr.push_back(obj);
                        }
                        res.body() = json::serialize(arr);
                        emitGoalEvent("list_days_success", user_info.mongoId, goal_id, 200,
                                     {{"count", (int)days.size()}});
                    }
                }
            }
            // POST /goals/{goal_id}/days
            else if (req_.method() == http::verb::post && target.find("/goals/") == 0 && target.find("/days") != std::string::npos && target.find("/events") == std::string::npos) {
                std::string goal_id = target.substr(7, target.find("/days") - 7);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("create_day_failed", user_info.mongoId, goal_id, status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto goal = GoalService::getInstance().getGoal(goal_id);
                    if (!goal || goal->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para agregar días a esta meta");
                        emitGoalEvent("create_day_failed", user_info.mongoId, goal_id, status_code,
                                     {{"reason", "permission_denied"}});
                    } else {
                        try {
                            json::value jv = json::parse(req_.body());
                            json::object& obj = jv.as_object();
                            std::string date = std::string(obj.at("date").as_string());
                            if (GoalService::getInstance().dayExistsForGoal(goal_id, date)) {
                                int status_code = static_cast<int>(http::status::conflict);
                                res.result(status_code);
                                json::object error;
                                error["error"] = "Ya existe un día registrado para esta fecha en esta meta";
                                error["goal_id"] = goal_id;
                                error["date"] = date;
                                res.body() = json::serialize(error);
                                res.prepare_payload();

                                boost::json::object extra;
                                extra["reason"] = "day_already_exists";
                                extra["date"] = date;
                                emitGoalEvent("create_day_failed", user_info.mongoId, goal_id, status_code, extra);
                                write_response(res);
                                return;
                            }
                            Day day;
                            day.goal_id = goal_id;
                            day.date = date;
                            
                            auto t = std::time(nullptr);
                            day.created_at = std::ctime(&t);
                            day.created_at.pop_back();
                            
                            std::string day_id;
                            bool success = GoalService::getInstance().createDay(day, day_id);
                            
                            if (success) {
                                int status_code = static_cast<int>(http::status::ok);
                                json::object response;
                                response["message"] = "Día agregado exitosamente";
                                response["day_id"] = day_id;
                                res.body() = json::serialize(response);
                                
                                boost::json::object extra;
                                extra["date"] = day.date;
                                emitGoalEvent("day_created", user_info.mongoId, goal_id, status_code, extra);
                            } else {
                                int status_code = static_cast<int>(http::status::internal_server_error);
                                res.result(status_code);
                                json::object error;
                                error["error"] = "Error al crear el día";
                                res.body() = json::serialize(error);
                                emitGoalEvent("create_day_failed", user_info.mongoId, goal_id, status_code,
                                             {{"reason", "database_error"}});
                            }
                        } catch (const std::exception& e) {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = e.what();
                            res.body() = json::serialize(error);
                            emitGoalEvent("create_day_failed", user_info.mongoId, goal_id, status_code,
                                         {{"reason", "invalid_json"}, {"error", e.what()}});
                        }
                    }
                }
            }
            // GET /days/{day_id}/events
            else if (req_.method() == http::verb::get && target.find("/days/") == 0 && target.find("/events") != std::string::npos) {
                std::string day_id = target.substr(6, target.find("/events") - 6);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("list_events_failed", user_info.mongoId, "", status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto day = GoalService::getInstance().getDay(day_id);
                    if (!day) {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Día no encontrado";
                        res.body() = json::serialize(error);
                        emitGoalEvent("list_events_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "day_not_found"}});
                    } else {
                        auto goal = GoalService::getInstance().getGoal(day->goal_id);
                        if (!goal || goal->user_id != user_info.mongoId) {
                            int status_code = static_cast<int>(http::status::forbidden);
                            auth::sendForbidden(res, "No tienes permiso para ver estos eventos");
                            emitGoalEvent("list_events_failed", user_info.mongoId, day->goal_id, status_code,
                                         {{"reason", "permission_denied"}});
                        } else {
                            auto events = GoalService::getInstance().getEventsByDay(day_id);
                            json::array arr;
                            for (const auto& e : events) {
                                json::object obj;
                                obj["id"] = e.id;
                                obj["title"] = e.title;
                                obj["description"] = e.description;
                                obj["amount"] = formatNumber(e.amount);
                                obj["created_at"] = e.created_at;
                                arr.push_back(obj);
                            }
                            res.body() = json::serialize(arr);
                            emitGoalEvent("list_events_success", user_info.mongoId, day->goal_id, 200,
                                         {{"count", (int)events.size()}});
                        }
                    }
                }
            }
            // POST /days/{day_id}/events
            else if (req_.method() == http::verb::post && target.find("/days/") == 0 && target.find("/events") != std::string::npos) {
                std::string day_id = target.substr(6, target.find("/events") - 6);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("create_event_failed", user_info.mongoId, "", status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto day = GoalService::getInstance().getDay(day_id);
                    if (!day) {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Día no encontrado";
                        res.body() = json::serialize(error);
                        emitGoalEvent("create_event_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "day_not_found"}});
                    } else {
                        auto goal = GoalService::getInstance().getGoal(day->goal_id);
                        if (!goal || goal->user_id != user_info.mongoId) {
                            int status_code = static_cast<int>(http::status::forbidden);
                            auth::sendForbidden(res, "No tienes permiso para agregar eventos a este día");
                            emitGoalEvent("create_event_failed", user_info.mongoId, day->goal_id, status_code,
                                         {{"reason", "permission_denied"}});
                        } else {
                            try {
                                json::value jv = json::parse(req_.body());
                                json::object& obj = jv.as_object();
                                
                                Event event;
                                event.day_id = day_id;
                                event.title = std::string(obj.at("title").as_string());
                                event.description = obj.contains("description") ? std::string(obj.at("description").as_string()) : "";
                                
                                if (obj.at("amount").is_double()) {
                                    event.amount = obj.at("amount").as_double();
                                } else if (obj.at("amount").is_int64()) {
                                    event.amount = static_cast<double>(obj.at("amount").as_int64());
                                } else {
                                    int status_code = static_cast<int>(http::status::bad_request);
                                    res.result(status_code);
                                    json::object error;
                                    error["error"] = "amount debe ser un número";
                                    res.body() = json::serialize(error);
                                    emitGoalEvent("create_event_failed", user_info.mongoId, day->goal_id, status_code,
                                                 {{"reason", "invalid_amount"}});
                                    return;
                                }
                                
                                auto t = std::time(nullptr);
                                event.created_at = std::ctime(&t);
                                event.created_at.pop_back();
                                
                                std::string event_id;
                                bool success = GoalService::getInstance().createEvent(event, event_id);
                                
                                if (success) {
                                    int status_code = static_cast<int>(http::status::ok);
                                    json::object response;
                                    response["message"] = "Evento creado exitosamente";
                                    response["event_id"] = event_id;
                                    res.body() = json::serialize(response);
                                    
                                    boost::json::object extra;
                                    extra["title"] = event.title;
                                    extra["amount"] = event.amount;
                                    emitGoalEvent("event_created", user_info.mongoId, day->goal_id, status_code, extra);
                                } else {
                                    int status_code = static_cast<int>(http::status::internal_server_error);
                                    res.result(status_code);
                                    json::object error;
                                    error["error"] = "Error al crear el evento";
                                    res.body() = json::serialize(error);
                                    emitGoalEvent("create_event_failed", user_info.mongoId, day->goal_id, status_code,
                                                 {{"reason", "database_error"}});
                                }
                            } catch (const std::exception& e) {
                                int status_code = static_cast<int>(http::status::bad_request);
                                res.result(status_code);
                                json::object error;
                                error["error"] = e.what();
                                res.body() = json::serialize(error);
                                emitGoalEvent("create_event_failed", user_info.mongoId, day->goal_id, status_code,
                                             {{"reason", "invalid_json"}, {"error", e.what()}});
                            }
                        }
                    }
                }
            }
            // GET /days/{id}
            else if (req_.method() == http::verb::get && target.find("/days/") == 0 && target != "/days") {
                std::string id = target.substr(6);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("get_day_failed", user_info.mongoId, "", status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto day = GoalService::getInstance().getDay(id);
                    if (!day) {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Día no encontrado";
                        res.body() = json::serialize(error);
                        emitGoalEvent("get_day_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "day_not_found"}});
                    } else {
                        auto goal = GoalService::getInstance().getGoal(day->goal_id);
                        if (!goal || goal->user_id != user_info.mongoId) {
                            int status_code = static_cast<int>(http::status::forbidden);
                            auth::sendForbidden(res, "No tienes permiso para ver este día");
                            emitGoalEvent("get_day_failed", user_info.mongoId, day->goal_id, status_code,
                                         {{"reason", "permission_denied"}});
                        } else {
                            json::object obj;
                            obj["id"] = day->id;
                            obj["goal_id"] = day->goal_id;
                            obj["date"] = day->date;
                            obj["created_at"] = day->created_at;
                            res.body() = json::serialize(obj);
                            emitGoalEvent("get_day_success", user_info.mongoId, day->goal_id, 200);
                        }
                    }
                }
            }
            // PUT /days/{id}
            else if (req_.method() == http::verb::put && target.find("/days/") == 0) {
                std::string id = target.substr(6);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("update_day_failed", user_info.mongoId, "", status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto day = GoalService::getInstance().getDay(id);
                    if (!day) {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Día no encontrado";
                        res.body() = json::serialize(error);
                        emitGoalEvent("update_day_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "day_not_found"}});
                    } else {
                        auto goal = GoalService::getInstance().getGoal(day->goal_id);
                        if (!goal || goal->user_id != user_info.mongoId) {
                            int status_code = static_cast<int>(http::status::forbidden);
                            auth::sendForbidden(res, "No tienes permiso para modificar este día");
                            emitGoalEvent("update_day_failed", user_info.mongoId, day->goal_id, status_code,
                                         {{"reason", "permission_denied"}});
                        } else {
                            try {
                                json::value jv = json::parse(req_.body());
                                json::object& obj = jv.as_object();
                                
                                std::string date = std::string(obj.at("date").as_string());
                                if (GoalService::getInstance().dayExistsForGoal(day->goal_id, date)) {
                                    int status_code = static_cast<int>(http::status::conflict);
                                    res.result(status_code);
                                    json::object error;
                                    error["error"] = "Ya existe un día registrado para esta fecha en esta meta";
                                    error["goal_id"] = day->goal_id;
                                    error["date"] = date;
                                    res.body() = json::serialize(error);
                                    res.prepare_payload();

                                    boost::json::object extra;
                                    extra["reason"] = "day_already_exists";
                                    extra["date"] = date;
                                    emitGoalEvent("create_day_failed", user_info.mongoId, day->goal_id, status_code, extra);
                                    write_response(res);
                                    return;
                                }
                                
                                bool success = GoalService::getInstance().updateDay(id, date);
                                
                                if (success) {
                                    int status_code = static_cast<int>(http::status::ok);
                                    json::object response;
                                    response["message"] = "Día actualizado exitosamente";
                                    res.body() = json::serialize(response);
                                    
                                    boost::json::object extra;
                                    extra["old_date"] = day->date;
                                    extra["new_date"] = date;
                                    emitGoalEvent("day_updated", user_info.mongoId, day->goal_id, status_code, extra);
                                } else {
                                    int status_code = static_cast<int>(http::status::not_found);
                                    res.result(status_code);
                                    json::object error;
                                    error["error"] = "Día no encontrado";
                                    res.body() = json::serialize(error);
                                    emitGoalEvent("update_day_failed", user_info.mongoId, day->goal_id, status_code,
                                                 {{"reason", "day_not_found"}});
                                }
                            } catch (const std::exception& e) {
                                int status_code = static_cast<int>(http::status::bad_request);
                                res.result(status_code);
                                json::object error;
                                error["error"] = e.what();
                                res.body() = json::serialize(error);
                                emitGoalEvent("update_day_failed", user_info.mongoId, day->goal_id, status_code,
                                             {{"reason", "invalid_json"}, {"error", e.what()}});
                            }
                        }
                    }
                }
            }
            // DELETE /days/{id}
            else if (req_.method() == http::verb::delete_ && target.find("/days/") == 0) {
                std::string id = target.substr(6);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("delete_day_failed", user_info.mongoId, "", status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto day = GoalService::getInstance().getDay(id);
                    if (!day) {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Día no encontrado";
                        res.body() = json::serialize(error);
                        emitGoalEvent("delete_day_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "day_not_found"}});
                    } else {
                        auto goal = GoalService::getInstance().getGoal(day->goal_id);
                        if (!goal || goal->user_id != user_info.mongoId) {
                            int status_code = static_cast<int>(http::status::forbidden);
                            auth::sendForbidden(res, "No tienes permiso para eliminar este día");
                            emitGoalEvent("delete_day_failed", user_info.mongoId, day->goal_id, status_code,
                                         {{"reason", "permission_denied"}});
                        } else {
                            bool success = GoalService::getInstance().deleteDay(id);
                            
                            if (success) {
                                int status_code = static_cast<int>(http::status::ok);
                                json::object response;
                                response["message"] = "Día eliminado exitosamente";
                                res.body() = json::serialize(response);
                                emitGoalEvent("day_deleted", user_info.mongoId, day->goal_id, status_code,
                                             {{"date", day->date}});
                            } else {
                                int status_code = static_cast<int>(http::status::not_found);
                                res.result(status_code);
                                json::object error;
                                error["error"] = "Día no encontrado";
                                res.body() = json::serialize(error);
                                emitGoalEvent("delete_day_failed", user_info.mongoId, day->goal_id, status_code,
                                             {{"reason", "day_not_found"}});
                            }
                        }
                    }
                }
            }
            // ============================================
            // EVENT ENDPOINTS
            // ============================================
            
            // GET /events/{id}
            else if (req_.method() == http::verb::get && target.find("/events/") == 0 && target != "/events") {
                std::string id = target.substr(8);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("get_event_failed", user_info.mongoId, "", status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto event = GoalService::getInstance().getEvent(id);
                    if (!event) {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Evento no encontrado";
                        res.body() = json::serialize(error);
                        emitGoalEvent("get_event_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "event_not_found"}});
                    } else {
                        auto day = GoalService::getInstance().getDay(event->day_id);
                        if (!day) {
                            int status_code = static_cast<int>(http::status::not_found);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Día no encontrado";
                            res.body() = json::serialize(error);
                            emitGoalEvent("get_event_failed", user_info.mongoId, "", status_code,
                                         {{"reason", "day_not_found"}});
                        } else {
                            auto goal = GoalService::getInstance().getGoal(day->goal_id);
                            if (!goal || goal->user_id != user_info.mongoId) {
                                int status_code = static_cast<int>(http::status::forbidden);
                                auth::sendForbidden(res, "No tienes permiso para ver este evento");
                                emitGoalEvent("get_event_failed", user_info.mongoId, day->goal_id, status_code,
                                             {{"reason", "permission_denied"}});
                            } else {
                                json::object obj;
                                obj["id"] = event->id;
                                obj["day_id"] = event->day_id;
                                obj["title"] = event->title;
                                obj["description"] = event->description;
                                obj["amount"] = formatNumber(event->amount);
                                obj["created_at"] = event->created_at;
                                res.body() = json::serialize(obj);
                                emitGoalEvent("get_event_success", user_info.mongoId, day->goal_id, 200);
                            }
                        }
                    }
                }
            }
            // PUT /events/{id}
            else if (req_.method() == http::verb::put && target.find("/events/") == 0) {
                std::string id = target.substr(8);
                std::cout << "[DEBUG] put events, ID:" << id << std::endl;
                
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("update_event_failed", user_info.mongoId, "", status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto event = GoalService::getInstance().getEvent(id);
                    if (!event) {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Evento no encontrado";
                        res.body() = json::serialize(error);
                        res.prepare_payload();
                        write_response(res);
                        emitGoalEvent("update_event_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "event_not_found"}});
                    } else {
                        auto day = GoalService::getInstance().getDay(event->day_id);
                        if (!day) {
                            int status_code = static_cast<int>(http::status::not_found);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Día no encontrado";
                            res.body() = json::serialize(error);
                            res.prepare_payload();
                            write_response(res);
                            emitGoalEvent("update_event_failed", user_info.mongoId, "", status_code,
                                         {{"reason", "day_not_found"}});
                        } else {
                            auto goal = GoalService::getInstance().getGoal(day->goal_id);
                            if (!goal || goal->user_id != user_info.mongoId) {
                                int status_code = static_cast<int>(http::status::forbidden);
                                auth::sendForbidden(res, "No tienes permiso para modificar este evento");
                                emitGoalEvent("update_event_failed", user_info.mongoId, day->goal_id, status_code,
                                             {{"reason", "permission_denied"}});
                            } else {
                                try {
                                    json::value jv = json::parse(req_.body());
                                    json::object& obj = jv.as_object();
                                    
                                    std::string title = std::string(obj.at("title").as_string());
                                    std::string description = obj.contains("description") ? std::string(obj.at("description").as_string()) : "";
                                    double amount = 0.0;
                                    
                                    if (obj.at("amount").is_double()) {
                                        amount = obj.at("amount").as_double();
                                    } else if (obj.at("amount").is_int64()) {
                                        amount = static_cast<double>(obj.at("amount").as_int64());
                                    } else {
                                        int status_code = static_cast<int>(http::status::bad_request);
                                        res.result(status_code);
                                        json::object error;
                                        error["error"] = "amount debe ser un número";
                                        res.body() = json::serialize(error);
                                        res.prepare_payload();
                                        write_response(res);
                                        emitGoalEvent("update_event_failed", user_info.mongoId, day->goal_id, status_code,
                                                     {{"reason", "invalid_amount"}});
                                        return;
                                    }
                                    
                                    bool success = GoalService::getInstance().updateEvent(id, title, description, amount);
                                    
                                    if (success) {
                                        int status_code = static_cast<int>(http::status::ok);
                                        json::object response;
                                        response["message"] = "Evento actualizado exitosamente";
                                        res.body() = json::serialize(response);
                                        res.prepare_payload();
                                        write_response(res);
                                        boost::json::object extra;
                                        extra["old_title"] = event->title;
                                        extra["old_amount"] = event->amount;
                                        extra["new_title"] = title;
                                        extra["new_amount"] = amount;
                                        emitGoalEvent("event_updated", user_info.mongoId, day->goal_id, status_code, extra);
                                    } else {
                                        int status_code = static_cast<int>(http::status::not_found);
                                        res.result(status_code);
                                        json::object error;
                                        error["error"] = "Evento no encontrado";
                                        res.body() = json::serialize(error);
                                        res.prepare_payload();
                                        write_response(res);    
                                        emitGoalEvent("update_event_failed", user_info.mongoId, day->goal_id, status_code,
                                                     {{"reason", "event_not_found"}});
                                    }
                                } catch (const std::exception& e) {
                                    int status_code = static_cast<int>(http::status::bad_request);
                                    res.result(status_code);
                                    json::object error;
                                    error["error"] = e.what();
                                    res.body() = json::serialize(error);
                                    res.prepare_payload();
                                    write_response(res);
                                    emitGoalEvent("update_event_failed", user_info.mongoId, day->goal_id, status_code,
                                                 {{"reason", "invalid_json"}, {"error", e.what()}});
                                }
                            }
                        }
                    }
                }
            }
            // DELETE /events/{id}
            else if (req_.method() == http::verb::delete_ && target.find("/events/") == 0) {
                std::string id = target.substr(8);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitGoalEvent("delete_event_failed", user_info.mongoId, "", status_code,
                                 {{"reason", "authentication_failed"}});
                } else {
                    auto event = GoalService::getInstance().getEvent(id);
                    if (!event) {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Evento no encontrado";
                        res.body() = json::serialize(error);
                        res.prepare_payload();
                        write_response(res);
                        emitGoalEvent("delete_event_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "event_not_found"}});
                    } else {
                        auto day = GoalService::getInstance().getDay(event->day_id);
                        if (!day) {
                            int status_code = static_cast<int>(http::status::not_found);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Día no encontrado";
                            res.body() = json::serialize(error);
                            res.prepare_payload();
                            write_response(res);
                            emitGoalEvent("delete_event_failed", user_info.mongoId, "", status_code,
                                         {{"reason", "day_not_found"}});
                        } else {
                            auto goal = GoalService::getInstance().getGoal(day->goal_id);
                            if (!goal || goal->user_id != user_info.mongoId) {
                                int status_code = static_cast<int>(http::status::forbidden);
                                auth::sendForbidden(res, "No tienes permiso para eliminar este evento");
                                emitGoalEvent("delete_event_failed", user_info.mongoId, day->goal_id, status_code,
                                             {{"reason", "permission_denied"}});
                            } else {
                                boost::json::object extra;
                                extra["title"] = event->title;
                                extra["amount"] = event->amount;
                                
                                bool success = GoalService::getInstance().deleteEvent(id);
                                
                                if (success) {
                                    int status_code = static_cast<int>(http::status::ok);
                                    json::object response;
                                    response["message"] = "Evento eliminado exitosamente";
                                    res.body() = json::serialize(response);
                                    res.prepare_payload();
                                    write_response(res);
                                    emitGoalEvent("event_deleted", user_info.mongoId, day->goal_id, status_code, extra);
                                } else {
                                    int status_code = static_cast<int>(http::status::not_found);
                                    res.result(status_code);
                                    json::object error;
                                    error["error"] = "Evento no encontrado";
                                    res.body() = json::serialize(error);
                                    res.prepare_payload();
                                    write_response(res);
                                    emitGoalEvent("delete_event_failed", user_info.mongoId, day->goal_id, status_code,
                                                 {{"reason", "event_not_found"}});
                                }
                            }
                        }
                    }
                }
            }
            else {
                res.result(http::status::not_found);
                json::object error;
                error["error"] = "Not Found";
                res.body() = json::serialize(error);
            }
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
        }
        
        res.prepare_payload();
        write_response(res);
    }
    
    void write_response(http::response<http::string_body>& res) {
        auto self = shared_from_this();
        http::async_write(socket_, res,
            [self](beast::error_code ec, std::size_t) {
                self->socket_.shutdown(tcp::socket::shutdown_send, ec);
            });
    }
};

class HttpServer {
    net::io_context ioc_;
    tcp::acceptor acceptor_;
    
public:
    HttpServer(const std::string& address, unsigned short port) 
        : ioc_(1), acceptor_(ioc_, tcp::endpoint(net::ip::make_address(address), port)) {
        std::cout << "Goals Service listening on " << address << ":" << port << std::endl;
    }
    
    void run() {
        do_accept();
        ioc_.run();
    }
    
private:
    void do_accept() {
        acceptor_.async_accept(
            [this](beast::error_code ec, tcp::socket socket) {
                if (!ec) {
                    std::make_shared<HttpSession>(std::move(socket))->run();
                }
                do_accept();
            });
    }
};

int main() {
    try {
        const char* port_env = std::getenv("SERVER_PORT");
        unsigned short port = port_env ? std::stoi(port_env) : 8082;
        
        const char* keycloak_url = std::getenv("KEYCLOAK_URL");
        const char* keycloak_realm = std::getenv("KEYCLOAK_REALM");
        const char* mongo_uri = std::getenv("MONGODB_URI");
        const char* mongo_db = std::getenv("MONGODB_DB");
        
        if (!keycloak_url) keycloak_url = "http://keycloak:8080";
        if (!keycloak_realm) keycloak_realm = "cuenta-confiable";
        if (!mongo_uri) mongo_uri = "mongodb://admin:secret123@mongodb:27017";
        if (!mongo_db) mongo_db = "cuenta-confiable";
        
        keycloak_client = std::make_unique<keycloak::KeycloakClient>(keycloak_url, keycloak_realm);
        
        Database::getInstance().connect(mongo_uri, mongo_db);
        
        std::cout << "[Kafka] Initializing Kafka producer..." << std::endl;
        kafka::getProducer();
        
        HttpServer server("0.0.0.0", port);
        server.run();
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}