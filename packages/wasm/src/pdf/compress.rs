use wasm_bindgen::prelude::*;
use lopdf::Document;
use crate::utils::error::wasm_error;
use std::io::Cursor;

#[wasm_bindgen]
pub fn compress_pdf(file: Vec<u8>, _quality: u8) -> Result<Vec<u8>, JsValue> {
    let mut doc = Document::load_from(Cursor::new(&file))
        .map_err(|e| wasm_error(&format!("Failed to load PDF: {}", e)))?;

    // Simple compression: remove unused objects and recompress streams
    doc.compress();
    
    let mut out_buffer = Vec::new();
    doc.save_to(&mut out_buffer)
        .map_err(|e| wasm_error(&format!("Failed to save PDF: {}", e)))?;
        
    Ok(out_buffer)
}
