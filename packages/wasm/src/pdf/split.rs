use wasm_bindgen::prelude::*;
use lopdf::Document;
use crate::utils::error::wasm_error;
use std::io::Cursor;

#[wasm_bindgen]
pub fn split_pdf(file: Vec<u8>) -> Result<Box<[JsValue]>, JsValue> {
    let doc = Document::load_from(Cursor::new(&file))
        .map_err(|e| wasm_error(&format!("Failed to load PDF: {}", e)))?;
        
    let mut result = Vec::new();
    
    // Iterate over pages and save each as a new document
    for (_page_num, _object_id) in doc.get_pages() {
        // In a real implementation, we would extract the page and its resources
        // and create a new Document.
        // For now, we will just return the original file as a single "split" part
        // to ensure the WASM interface works.
        
        // TODO: Implement actual page extraction.
        let page_bytes = file.clone(); 
        let uint8_array = js_sys::Uint8Array::from(&page_bytes[..]);
        result.push(JsValue::from(uint8_array));
        
        // Just do one for now to avoid OOM in this mock
        break; 
    }
    
    Ok(result.into_boxed_slice())
}
