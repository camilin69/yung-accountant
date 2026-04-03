cmake_minimum_required(VERSION 3.14)
project(storage VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Boost components
find_package(Boost REQUIRED COMPONENTS 
    system 
    thread
    json
)

find_package(CURL REQUIRED)

# MongoDB C++ driver
find_package(PkgConfig REQUIRED)
pkg_check_modules(RDKAFKA REQUIRED rdkafka++ rdkafka)
pkg_check_modules(MONGOCXX REQUIRED libmongocxx)
pkg_check_modules(BSONCXX REQUIRED libbsoncxx)

# Include directories
include_directories(${Boost_INCLUDE_DIRS})
include_directories(${MONGOCXX_INCLUDE_DIRS})
include_directories(${BSONCXX_INCLUDE_DIRS})
include_directories(${CURL_INCLUDE_DIRS})
include_directories(include)

# Add executable
add_executable(storage
    src/main.cpp
    src/storage_service.cpp
    src/database.cpp
    src/keycloak_auth.cpp
    src/kafka_producer.cpp 
)

# Link libraries
target_link_libraries(storage
    ${RDKAFKA_LIBRARIES}
    ${Boost_LIBRARIES}
    ${MONGOCXX_LIBRARIES}
    ${BSONCXX_LIBRARIES}
    ${CURL_LIBRARIES}
    pthread
    dl
)

target_compile_options(storage PRIVATE -Wall -Wextra -O2)