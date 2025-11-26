from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response, JSONResponse
from service.bg_engine import BgRemoveEngine
from utils.file_utils import is_allowed_file

app = FastAPI()

@app.get("/")
def health_check():
    return {"service": "bg-remove-service", "status": "running"}

@app.post("/process")
async def remove_background(file: UploadFile = File(...)):
    if not is_allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: png, jpg, jpeg, webp")

    try:
        content = await file.read()
        processed_image = BgRemoveEngine.process_image(content)
        return Response(content=processed_image, media_type="image/png")
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
