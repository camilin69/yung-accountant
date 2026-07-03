cmake_minimum_required(VERSION 3.14)
project(auth VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(PostgreSQL REQUIRED)
find_package(PkgConfig REQUIRED)
find_package(Boost REQUIRED COMPONENTS system thread json)
find_package(OpenSSL REQUIRED)

add_subdirectory(../common common_build)
include_directories(${Boost_INCLUDE_DIRS} ${PostgreSQL_INCLUDE_DIRS} include ../common/include)

add_executable(auth
    src/main.cpp
    src/user_service.cpp
    src/keycloak_auth.cpp
)

target_link_libraries(auth
    common
    ${PostgreSQL_LIBRARIES}
    ${Boost_LIBRARIES}
    ${OPENSSL_LIBRARIES}
    pthread
    dl
)

target_compile_options(auth PRIVATE -Wall -Wextra -O2)