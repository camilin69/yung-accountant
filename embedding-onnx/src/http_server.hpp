// src/http_server.hpp
#pragma once

#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <nlohmann/json.hpp>
#include <iostream>
#include <memory>
#include <functional>

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
using json = nlohmann::json;
using tcp = net::ip::tcp;

class EmbeddingHttpServer {
    net::io_context ioc_;
    tcp::acceptor acceptor_;
    std::function<json(const json&)> handle_request_;
    
    class Session : public std::enable_shared_from_this<Session> {
        tcp::socket socket_;
        beast::flat_buffer buffer_;
        std::function<json(const json&)>& handler_;
        
    public:
        Session(tcp::socket&& socket, std::function<json(const json&)>& handler)
            : socket_(std::move(socket)), handler_(handler) {}
        
        void run() {
            read_request();
        }
        
    private:
        void read_request() {
            auto self = shared_from_this();
            auto req = std::make_shared<http::request<http::string_body>>();
            
            http::async_read(socket_, buffer_, *req,
                [self, req](beast::error_code ec, std::size_t) {
                    if (!ec) {
                        self->handle_request(*req);
                    }
                });
        }
        
        void handle_request(http::request<http::string_body>& req) {
            auto res = std::make_shared<http::response<http::string_body>>(
                http::status::ok, req.version());

            std::cout << "Received " << req.method_string() << " " << req.target() 
                << " body_size=" << req.body().size() << std::endl;
                
            res->set(http::field::server, "Embedding Service");
            res->set(http::field::content_type, "application/json");
            res->set(http::field::access_control_allow_origin, "*");
            res->set(http::field::access_control_allow_methods, "GET, POST, OPTIONS");
            res->set(http::field::access_control_allow_headers, "Content-Type");
            res->keep_alive(false);  // Cerrar conexion despues de responder
            
            try {
                if (req.method() == http::verb::options) {
                    res->result(http::status::ok);
                }
                else if (req.method() == http::verb::get && req.target() == "/health") {
                    json health;
                    health["status"] = "ok";
                    health["model"] = "all-MiniLM-L6-v2";
                    health["dimensions"] = 384;
                    health["framework"] = "ONNX Runtime";
                    res->body() = health.dump();
                }
                else if (req.method() == http::verb::post && req.target() == "/embed") {
                    auto request_obj = json::parse(req.body());
                    auto response = handler_(request_obj);
                    res->body() = response.dump();
                }
                else {
                    res->result(http::status::not_found);
                    json err;
                    err["error"] = "Not Found";
                    res->body() = err.dump();
                }
            } catch (const std::exception& e) {
                res->result(http::status::internal_server_error);
                json err;
                err["error"] = e.what();
                res->body() = err.dump();
            }
            
            write_response(res);
        }
        
        void write_response(std::shared_ptr<http::response<http::string_body>> res) {
            auto self = shared_from_this();
            res->prepare_payload();
            http::async_write(socket_, *res,
                [self, res](beast::error_code ec, std::size_t) {
                    if (ec) {
                        std::cerr << "Write error: " << ec.message() << std::endl;
                    }
                    // Cerrar el socket
                    beast::error_code ignored;
                    self->socket_.shutdown(tcp::socket::shutdown_send, ignored);
                });
        }
    };
    
public:
    EmbeddingHttpServer(const std::string& address, unsigned short port,
                        std::function<json(const json&)> handler)
        : acceptor_(ioc_, tcp::endpoint(net::ip::make_address(address), port))
        , handle_request_(std::move(handler)) {}
    
    void run() {
        do_accept();
        std::cout << "Server running on http://0.0.0.0:" 
                  << acceptor_.local_endpoint().port() << std::endl;
        ioc_.run();
    }
    
    void stop() {
        ioc_.stop();
    }
    
private:
    void do_accept() {
        acceptor_.async_accept(
            [this](beast::error_code ec, tcp::socket socket) {
                if (!ec) {
                    std::make_shared<Session>(std::move(socket), handle_request_)->run();
                }
                do_accept();
            });
    }
};