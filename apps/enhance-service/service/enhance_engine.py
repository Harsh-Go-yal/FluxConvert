import cv2
import numpy as np
from pdf2image import convert_from_bytes
import img2pdf
import io
from PIL import Image

class EnhanceEngine:
    @staticmethod
    def enhance_image(image_bytes: bytes) -> bytes:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Could not decode image")

        # Denoise
        dst = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
        
        # Convert to grayscale
        gray = cv2.cvtColor(dst, cv2.COLOR_BGR2GRAY)
        
        # Adaptive Thresholding to create a clean black and white effect
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, \
                                       cv2.THRESH_BINARY, 11, 2)
        
        # Encode back to bytes
        is_success, buffer = cv2.imencode(".jpg", thresh)
        if not is_success:
            raise ValueError("Could not encode image")
            
        return buffer.tobytes()

    @staticmethod
    def enhance_pdf(pdf_bytes: bytes) -> bytes:
        # Convert PDF pages to images
        images = convert_from_bytes(pdf_bytes)
        enhanced_images = []

        for image in images:
            # Convert PIL image to OpenCV format
            open_cv_image = np.array(image) 
            # Convert RGB to BGR 
            open_cv_image = open_cv_image[:, :, ::-1].copy() 

            # Denoise
            dst = cv2.fastNlMeansDenoisingColored(open_cv_image, None, 10, 10, 7, 21)
            
            # Grayscale & Threshold
            gray = cv2.cvtColor(dst, cv2.COLOR_BGR2GRAY)
            thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, \
                                           cv2.THRESH_BINARY, 11, 2)
            
            # Convert back to PIL Image
            enhanced_pil = Image.fromarray(thresh)
            enhanced_images.append(enhanced_pil)

        # Save images back to PDF
        output = io.BytesIO()
        # img2pdf expects bytes, so we save PIL images to bytes first or use PIL's save
        # Using PIL's save is easier for multi-page
        enhanced_images[0].save(output, save_all=True, append_images=enhanced_images[1:], format="PDF")
        return output.getvalue()
