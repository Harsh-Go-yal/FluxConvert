#!/bin/bash
set -e

# Ensure wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    if [ -d "pkg" ]; then
        echo "wasm-pack not found, but 'pkg' directory exists. Using existing build."
        exit 0
    else
        echo "wasm-pack could not be found and 'pkg' directory is missing."
        echo "Please install it with 'cargo install wasm-pack' and run this script locally."
        exit 1
    fi
fi

echo "Building WASM package..."
wasm-pack build --target web --release --out-dir pkg

echo "WASM build complete!"
