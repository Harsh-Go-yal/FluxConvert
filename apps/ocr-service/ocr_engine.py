from paddleocr import PaddleOCR
import cv2
import numpy as np

class OCREngine:
    def __init__(self):
        # Initialize PaddleOCR (lang='en' by default)
        self.ocr = PaddleOCR(use_angle_cls=True, lang='en')

    def process_image(self, image_bytes):
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Run OCR
        result = self.ocr.ocr(img, cls=True)
        
        extracted_text = []
        for line in result:
            for word_info in line:
                text = word_info[1][0]
                confidence = word_info[1][1]
                extracted_text.append({"text": text, "confidence": confidence})
                
        return extracted_text
