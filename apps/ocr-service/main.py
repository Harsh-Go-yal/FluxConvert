from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from service.ocr_engine import ocr_engine
from utils.file_utils import is_allowed_file

app = FastAPI()

@app.get("/")
def health_check():
    return {"service": "ocr-service", "status": "running"}

@app.post("/process")
async def process_ocr(file: UploadFile = File(...)):
    if not is_allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: png, jpg, jpeg, pdf")

    try:
        content = await file.read()
        result = ocr_engine.process_image(content)
        return JSONResponse(content={"success": True, "data": result})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
