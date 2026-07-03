cmake_minimum_required(VERSION 3.16)
project(common LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ── Find dependencies ──────────────────────────────────────────
find_package(Boost REQUIRED COMPONENTS json)
find_package(PkgConfig REQUIRED)
pkg_check_modules(PQXX REQUIRED libpqxx)
pkg_check_modules(HIREDIS REQUIRED hiredis)
pkg_check_modules(RDKAFKA REQUIRED rdkafka++)
pkg_check_modules(CURL REQUIRED libcurl)

# ── Static library ─────────────────────────────────────────────
add_library(common STATIC
    src/database.cpp
    src/redis_client.cpp
    src/kafka_producer.cpp
    src/keycloak_auth.cpp
)

target_include_directories(common PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${PQXX_INCLUDE_DIRS}
    ${HIREDIS_INCLUDE_DIRS}
    ${RDKAFKA_INCLUDE_DIRS}
    ${CURL_INCLUDE_DIRS}
)

target_link_libraries(common PUBLIC
    ${PQXX_LIBRARIES}
    ${HIREDIS_LIBRARIES}
    ${RDKAFKA_LIBRARIES}
    ${CURL_LIBRARIES}
    Boost::json
)
