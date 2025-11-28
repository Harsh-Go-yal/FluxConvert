#!/bin/bash
set -e

# Ensure wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack could not be found. Please install it with 'cargo install wasm-pack'"
    exit 1
fi

echo "Building WASM package..."
wasm-pack build --target web --release --out-dir pkg

echo "WASM build complete!"
