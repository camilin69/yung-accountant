cmake_minimum_required(VERSION 3.14)
project(event_consumer VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Boost
find_package(Boost REQUIRED COMPONENTS 
    system 
    thread
    json
)

# Find PkgConfig
find_package(PkgConfig REQUIRED)

# Find librdkafka
pkg_check_modules(RDKAFKA REQUIRED rdkafka++ rdkafka)

# MongoDB C++ driver
pkg_check_modules(MONGOCXX REQUIRED libmongocxx)
pkg_check_modules(BSONCXX REQUIRED libbsoncxx)

# Include directories
include_directories(${Boost_INCLUDE_DIRS})
include_directories(${RDKAFKA_INCLUDE_DIRS})
include_directories(${MONGOCXX_INCLUDE_DIRS})
include_directories(${BSONCXX_INCLUDE_DIRS})
include_directories(include)

# Add executable
add_executable(event_consumer
    src/main.cpp
    src/kafka_producer.cpp
    src/database.cpp
)

# Link libraries - ORDEN IMPORTANTE
target_link_libraries(event_consumer
    ${RDKAFKA_LIBRARIES}
    ${Boost_LIBRARIES}
    ${MONGOCXX_LIBRARIES}
    ${BSONCXX_LIBRARIES}
    pthread
    dl
)

target_compile_options(event_consumer PRIVATE -Wall -Wextra -O2)