cmake_minimum_required(VERSION 3.14)
project(auth VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find PostgreSQL
find_package(PostgreSQL REQUIRED)

# Find Boost components
find_package(Boost REQUIRED COMPONENTS 
    system 
    thread
    json
)

find_package(CURL REQUIRED)

# Find librdkafka
find_package(PkgConfig REQUIRED)
pkg_check_modules(RDKAFKA REQUIRED rdkafka++ rdkafka)

pkg_check_modules(PQXX REQUIRED libpqxx)

# Include directories
include_directories(${Boost_INCLUDE_DIRS})
include_directories(${PostgreSQL_INCLUDE_DIRS})
include_directories(${CURL_INCLUDE_DIRS})
include_directories(include)

# Add executable
add_executable(auth
    src/main.cpp
    src/user_service.cpp
    src/database.cpp
    src/keycloak_auth.cpp
    src/kafka_producer.cpp 
)

# Link libraries
target_link_libraries(auth
    ${PQXX_LIBRARIES}
    ${PostgreSQL_LIBRARIES}
    ${RDKAFKA_LIBRARIES}
    ${Boost_LIBRARIES}
    ${CURL_LIBRARIES}
    pthread
    dl
)

target_include_directories(auth PRIVATE
    ${PQXX_INCLUDE_DIRS}
    ${PostgreSQL_INCLUDE_DIRS}
    ${Boost_INCLUDE_DIRS}
    ${CURL_INCLUDE_DIRS}
)

target_compile_options(auth PRIVATE -Wall -Wextra -O2)