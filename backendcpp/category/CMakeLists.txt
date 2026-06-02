cmake_minimum_required(VERSION 3.14)
project(category VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find PostgreSQL
find_package(PostgreSQL REQUIRED)

# Find Redis (hiredis)
find_package(PkgConfig REQUIRED)
pkg_check_modules(HIREDIS REQUIRED hiredis)

# Find Boost components
find_package(Boost REQUIRED COMPONENTS 
    system 
    thread
    json
)

find_package(CURL REQUIRED)

# Find librdkafka
pkg_check_modules(RDKAFKA REQUIRED rdkafka++ rdkafka)

pkg_check_modules(PQXX REQUIRED libpqxx)

# Include directories
include_directories(${Boost_INCLUDE_DIRS})
include_directories(${PostgreSQL_INCLUDE_DIRS})
include_directories(${CURL_INCLUDE_DIRS})
include_directories(${HIREDIS_INCLUDE_DIRS})
include_directories(include)

# Add executable
add_executable(category
    src/main.cpp
    src/category_service.cpp
    src/database.cpp
    src/keycloak_auth.cpp
    src/kafka_producer.cpp
    src/redis_client.cpp
)

# Link libraries
target_link_libraries(category
    ${PQXX_LIBRARIES}
    ${PostgreSQL_LIBRARIES}
    ${RDKAFKA_LIBRARIES}
    ${Boost_LIBRARIES}
    ${CURL_LIBRARIES}
    ${HIREDIS_LIBRARIES}
    pthread
    dl
)

target_include_directories(category PRIVATE
    ${PQXX_INCLUDE_DIRS}
    ${PostgreSQL_INCLUDE_DIRS}
    ${Boost_INCLUDE_DIRS}
    ${CURL_INCLUDE_DIRS}
    ${HIREDIS_INCLUDE_DIRS}
)

target_compile_options(category PRIVATE -Wall -Wextra -O2)