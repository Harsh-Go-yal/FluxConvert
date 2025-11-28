use wasm_bindgen::prelude::*;
use image::io::Reader as ImageReader;
use std::io::Cursor;
use crate::utils::error::wasm_error;

#[wasm_bindgen]
pub fn resize_image(bytes: Vec<u8>, width: u32, height: u32) -> Result<Vec<u8>, JsValue> {
    let img = ImageReader::new(Cursor::new(&bytes))
        .with_guessed_format()
        .map_err(|e| wasm_error(&format!("Failed to guess image format: {}", e)))?
        .decode()
        .map_err(|e| wasm_error(&format!("Failed to decode image: {}", e)))?;

    let resized = img.resize(width, height, image::imageops::FilterType::Lanczos3);
    
    let mut out_buffer = Vec::new();
    resized.write_to(&mut Cursor::new(&mut out_buffer), image::ImageOutputFormat::Png)
        .map_err(|e| wasm_error(&format!("Failed to write resized image: {}", e)))?;
        
    Ok(out_buffer)
}
