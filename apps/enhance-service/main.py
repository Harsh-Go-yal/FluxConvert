from fastapi import FastAPI, UploadFile, File
from fastapi.responses import Response
import cv2
import numpy as np

app = FastAPI()

@app.post("/enhance")
async def enhance_image(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Auto brightness and contrast
    # Clip histogram to remove outliers
    # This is a simple implementation, can be improved
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl,a,b))
    final = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    
    # Denoise
    final = cv2.fastNlMeansDenoisingColored(final, None, 10, 10, 7, 21)
    
    res, im_png = cv2.imencode(".png", final)
    return Response(content=im_png.tobytes(), media_type="image/png")
