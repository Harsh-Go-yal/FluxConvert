use wasm_bindgen::prelude::*;
use image::io::Reader as ImageReader;
use std::io::Cursor;
use crate::utils::error::wasm_error;

#[wasm_bindgen]
pub fn optimize_image(bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
    // For now, "optimize" will just re-encode as JPEG with default settings,
    // which often reduces size compared to raw or unoptimized PNGs.
    // Real optimization would involve more advanced libraries like `mozjpeg` or `oxipng`,
    // but `image` crate provides basic encoding control.
    
    let img = ImageReader::new(Cursor::new(&bytes))
        .with_guessed_format()
        .map_err(|e| wasm_error(&format!("Failed to guess image format: {}", e)))?
        .decode()
        .map_err(|e| wasm_error(&format!("Failed to decode image: {}", e)))?;

    let mut out_buffer = Vec::new();
    // Re-encode as JPEG with 80% quality
    img.write_to(&mut Cursor::new(&mut out_buffer), image::ImageOutputFormat::Jpeg(80))
        .map_err(|e| wasm_error(&format!("Failed to write optimized image: {}", e)))?;
        
    Ok(out_buffer)
}
