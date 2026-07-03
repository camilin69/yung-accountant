cmake_minimum_required(VERSION 3.14)
project(debt VERSION 1.0.0)

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
# Find librdkafka
# Include directories
include_directories(${Boost_INCLUDE_DIRS})
include_directories(${PostgreSQL_INCLUDE_DIRS})
include_directories(include)

# Add executable
add_executable(debt
    src/main.cpp
    src/debt_service.cpp
    
    
    
    
)

# Link libraries
target_link_libraries(debt
    common
    ${PostgreSQL_LIBRARIES}
    ${Boost_LIBRARIES}
    pthread
    dl
)

target_include_directories(debt PRIVATE
    ../common/include
    ${PostgreSQL_INCLUDE_DIRS}
    ${Boost_INCLUDE_DIRS}
)

target_compile_options(debt PRIVATE -Wall -Wextra -O2)