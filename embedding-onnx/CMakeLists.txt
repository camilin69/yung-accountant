# embedding-onnx/CMakeLists.txt
cmake_minimum_required(VERSION 3.16)
project(embedding_service VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Encontrar Boost con JSON
find_package(Boost REQUIRED COMPONENTS system thread filesystem)

find_package(CURL REQUIRED)
find_package(OpenSSL REQUIRED)

# ONNX Runtime
set(ONNX_RUNTIME_DIR "${CMAKE_SOURCE_DIR}/onnxruntime" CACHE PATH "ONNX Runtime directory")
set(ONNX_RUNTIME_INCLUDE_DIR "${ONNX_RUNTIME_DIR}/include")
set(ONNX_RUNTIME_LIB_DIR "${ONNX_RUNTIME_DIR}/lib")

include_directories(
    ${CMAKE_SOURCE_DIR}/src
    ${ONNX_RUNTIME_INCLUDE_DIR}
)

# Archivos fuente
set(SOURCES
    src/main.cpp
    src/embedding_service.cpp
    src/tokenizer.cpp
)

set(HEADERS
    src/embedding_service.hpp
    src/tokenizer.hpp
    src/http_server.hpp
)

add_executable(embedding_service ${SOURCES} ${HEADERS})

target_link_libraries(embedding_service
    ${ONNX_RUNTIME_LIB_DIR}/libonnxruntime.so
    ${Boost_LIBRARIES}
    ${CURL_LIBRARIES}
    pthread
    dl
)

target_compile_options(embedding_service PRIVATE -O3)