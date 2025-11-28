# @flux/wasm

High-performance WebAssembly modules for FluxConvert, built with Rust.

## Features

### PDF Tools
- **Merge**: Combine multiple PDFs into one.
- **Split**: Split a PDF into individual pages.
- **Compress**: Optimize PDF file size.

### Image Tools
- **Resize**: Resize images to specific dimensions.
- **Optimize**: Reduce image file size without significant quality loss.

## Build Instructions

1.  **Prerequisites**:
    - Rust and Cargo installed.
    - `wasm-pack` installed: `cargo install wasm-pack`.

2.  **Build**:
    ```bash
    npm run build
    # OR
    ./build.sh
    ```

## Usage in Next.js

This package is designed to be used with Web Workers to keep the main thread free.

### Example: PDF Merge

```typescript
import { mergePdfs } from '@/services/wasm/pdf-wasm-service';

const mergedPdfBytes = await mergePdfs(files);
```

## Development

To rebuild automatically on changes:

```bash
cargo watch -x "wasm-pack build --target web --out-dir pkg"
```
