#!/bin/bash
# embedding-onnx/scripts/download_model.sh

set -e

echo "========================================"
echo "Downloading all-MiniLM-L6-v2 model"
echo "========================================"

MODEL_DIR="/app/models"
TOKENIZER_DIR="${MODEL_DIR}/tokenizer"
mkdir -p "$MODEL_DIR" "$TOKENIZER_DIR"

python3 << 'PYEOF'
import os
import torch
from transformers import AutoTokenizer, AutoModel
torch.manual_seed(42)

model_name = "sentence-transformers/all-MiniLM-L6-v2"
model_dir = "/app/models"
tokenizer_dir = f"{model_dir}/tokenizer"

print(f"Loading {model_name}...")

# Tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.save_pretrained(tokenizer_dir)
print(f"Tokenizer: {len(tokenizer)} tokens")

# Modelo
print("Loading model...")
model = AutoModel.from_pretrained(model_name)
model.eval()
print("Model loaded")

# Exportar con dynamic_axes (compatible con torch.onnx.export)
print("Exporting to ONNX...")

text = "Hello world, this is a test sentence for ONNX export with batch support"
encoded = tokenizer(text, padding="max_length", truncation=True, 
                     max_length=128, return_tensors="pt")

input_ids = encoded["input_ids"]
attention_mask = encoded["attention_mask"]
token_type_ids = torch.zeros_like(input_ids)

print(f"Input shape: {input_ids.shape}")

onnx_path = f"{model_dir}/model.onnx"

# Exportar con dynamic_axes para soportar batch_size y sequence_length variables
torch.onnx.export(
    model,
    (input_ids, attention_mask, token_type_ids),
    onnx_path,
    input_names=["input_ids", "attention_mask", "token_type_ids"],
    output_names=["token_embeddings"],
    dynamic_axes={
        "input_ids": {0: "batch_size", 1: "sequence_length"},
        "attention_mask": {0: "batch_size", 1: "sequence_length"},
        "token_type_ids": {0: "batch_size", 1: "sequence_length"},
        "token_embeddings": {0: "batch_size", 1: "sequence_length"}
    },
    opset_version=15,
    do_constant_folding=True,
    export_params=True,
    verbose=False
)

size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
size_total = size_mb

# Verificar si hay archivo de datos externo
data_path = onnx_path + ".data"
if os.path.exists(data_path):
    size_total += os.path.getsize(data_path) / (1024 * 1024)

print(f"Model exported: {size_mb:.1f} MB (total: {size_total:.1f} MB)")

# Si es muy pequeno, reintentar con otro metodo
if size_total < 10:
    print("WARNING: Model too small, retrying with different settings...")
    
    # Usar dos textos para forzar batch_size=2
    texts = ["Hello world", "Finance banking test"]
    encoded = tokenizer(texts, padding="max_length", truncation=True, 
                         max_length=128, return_tensors="pt")
    
    torch.onnx.export(
        model,
        (encoded["input_ids"], encoded["attention_mask"], torch.zeros_like(encoded["input_ids"])),
        onnx_path,
        input_names=["input_ids", "attention_mask", "token_type_ids"],
        output_names=["token_embeddings"],
        dynamic_axes={
            "input_ids": {0: "batch_size", 1: "sequence_length"},
            "attention_mask": {0: "batch_size", 1: "sequence_length"},
            "token_type_ids": {0: "batch_size", 1: "sequence_length"},
            "token_embeddings": {0: "batch_size", 1: "sequence_length"}
        },
        opset_version=15,
        do_constant_folding=True,
        export_params=True,
        verbose=True
    )
    
    size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    size_total = size_mb
    if os.path.exists(data_path):
        size_total += os.path.getsize(data_path) / (1024 * 1024)
    print(f"Retry result: {size_mb:.1f} MB (total: {size_total:.1f} MB)")

# Guardar config
import json
config = {
    "model_name": model_name,
    "max_length": 128,
    "embedding_dim": 384,
    "pooling": "mean",
    "normalize": True
}
with open(f"{model_dir}/config.json", "w") as f:
    json.dump(config, f)

print("========================================")
print(f"Files in {model_dir}:")
for f in sorted(os.listdir(model_dir)):
    fpath = os.path.join(model_dir, f)
    if os.path.isfile(fpath):
        size_kb = os.path.getsize(fpath) / 1024
        print(f"  {f}: {size_kb:.1f} KB")
    elif os.path.isdir(fpath):
        print(f"  {f}/ (directory)")
print("========================================")

PYEOF

echo "Setup complete!"