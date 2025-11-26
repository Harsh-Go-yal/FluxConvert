from rembg import remove
from PIL import Image
import io

class BgRemoveEngine:
    @staticmethod
    def process_image(image_bytes: bytes) -> bytes:
        input_image = Image.open(io.BytesIO(image_bytes))
        output_image = remove(input_image)
        
        output_buffer = io.BytesIO()
        output_image.save(output_buffer, format="PNG")
        return output_buffer.getvalue()

# Global instance not strictly needed as rembg handles sessions internally, 
# but good for consistency if we want to pre-load models.
