# embedding-onnx/Dockerfile

# ============================================
# ETAPA 1: Python + Descarga del modelo (Debian)
# ============================================
FROM python:3.11-slim-bookworm AS model-builder

RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir \
    transformers \
    torch \
    onnx \
    onnxruntime \
    onnxscript

WORKDIR /app
COPY scripts/download_model.sh .
RUN sed -i 's/\r$//' download_model.sh && chmod +x download_model.sh && ./download_model.sh

# ============================================
# ETAPA 2: Compilación C++ (Debian)
# ============================================
FROM debian:bookworm-slim AS builder

RUN apt-get update && apt-get install -y \
    build-essential cmake wget \
    libcurl4-openssl-dev libssl-dev \
    libboost-dev libboost-system-dev libboost-thread-dev libboost-filesystem-dev \
    nlohmann-json3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Descargar ONNX Runtime pre-compilado
RUN wget -q https://github.com/microsoft/onnxruntime/releases/download/v1.19.2/onnxruntime-linux-x64-1.19.2.tgz \
    && tar -xzf onnxruntime-linux-x64-1.19.2.tgz \
    && mv onnxruntime-linux-x64-1.19.2 onnxruntime \
    && rm onnxruntime-linux-x64-1.19.2.tgz

# Copiar código fuente
COPY CMakeLists.txt .
COPY src/ src/

# Copiar modelo desde la etapa Python
COPY --from=model-builder /app/models/ /app/models/

# Compilar
RUN mkdir -p build && cd build \
    && cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DONNX_RUNTIME_DIR=/app/onnxruntime \
    && cmake --build . -j$(nproc)

# ============================================
# ETAPA 3: Imagen final (Debian Slim)
# ============================================
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libcurl4 \
    libssl3 \
    libboost-system1.74.0 \
    libboost-thread1.74.0 \
    libboost-filesystem1.74.0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copiar ONNX Runtime
COPY --from=builder /app/onnxruntime/lib/libonnxruntime.so* /usr/lib/x86_64-linux-gnu/
RUN ldconfig

# Copiar modelo
COPY --from=builder /app/models/ /app/models/

# Copiar binario
COPY --from=builder /app/build/embedding_service /app/embedding_service

ENV MODEL_PATH=/app/models/model.onnx
ENV TOKENIZER_PATH=/app/models/tokenizer
ENV NUM_THREADS=4
ENV PORT=8090

EXPOSE 8090

CMD ["/app/embedding_service"]