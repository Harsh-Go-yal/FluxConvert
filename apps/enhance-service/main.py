from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response, JSONResponse
from service.enhance_engine import EnhanceEngine
from utils.file_utils import is_allowed_file

app = FastAPI()

@app.get("/")
def health_check():
    return {"service": "enhance-service", "status": "running"}

@app.post("/process")
async def enhance_document(file: UploadFile = File(...)):
    if not is_allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: png, jpg, jpeg, pdf")

    try:
        content = await file.read()
        filename = file.filename.lower()
        
        if filename.endswith('.pdf'):
            processed_content = EnhanceEngine.enhance_pdf(content)
            media_type = "application/pdf"
            filename_prefix = "enhanced_"
        else:
            processed_content = EnhanceEngine.enhance_image(content)
            media_type = "image/jpeg"
            filename_prefix = "enhanced_"

        return Response(content=processed_content, media_type=media_type, headers={"Content-Disposition": f"attachment; filename={filename_prefix}{file.filename}"})

    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
