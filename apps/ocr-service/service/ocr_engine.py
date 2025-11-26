from paddleocr import PaddleOCR
import numpy as np
import cv2

class OcrEngine:
    def __init__(self):
        # Initialize PaddleOCR once
        self.ocr = PaddleOCR(use_angle_cls=True, lang='en')

    def process_image(self, image_bytes: bytes) -> dict:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Could not decode image")

        result = self.ocr.ocr(img, cls=True)
        
        extracted_text = []
        structured_data = []

        if result and result[0]:
            for line in result[0]:
                box = line[0]
                text, confidence = line[1]
                extracted_text.append(text)
                structured_data.append({
                    "text": text,
                    "confidence": float(confidence),
                    "box": box
                })

        return {
            "full_text": "\n".join(extracted_text),
            "structured_data": structured_data
        }

# Global instance
ocr_engine = OcrEngine()
