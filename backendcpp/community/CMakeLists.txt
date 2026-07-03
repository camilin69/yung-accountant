cmake_minimum_required(VERSION 3.14)
project(community VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find PostgreSQL
find_package(PostgreSQL REQUIRED)

# Find Redis (hiredis)
find_package(PkgConfig REQUIRED)
add_subdirectory(../common common_build)

# Find Boost components
find_package(Boost REQUIRED COMPONENTS 
    system 
    thread
    json
)

find_package(OpenSSL REQUIRED)

# Find librdkafka
# Include directories
include_directories(${Boost_INCLUDE_DIRS})
include_directories(${PostgreSQL_INCLUDE_DIRS})
include_directories(include)

# Add executable
add_executable(community
    src/main.cpp
    src/community_service.cpp
    
    
    
    
)

# Link libraries
target_link_libraries(community
    common
    ${PostgreSQL_LIBRARIES}
    ${Boost_LIBRARIES}
    ${OPENSSL_LIBRARIES}
    pthread
    dl
)

target_include_directories(community PRIVATE
    ../common/include
    ${PostgreSQL_INCLUDE_DIRS}
    ${Boost_INCLUDE_DIRS}
)

target_compile_options(community PRIVATE -Wall -Wextra -O2)