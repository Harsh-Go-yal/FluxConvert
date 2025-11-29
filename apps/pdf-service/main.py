from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, JSONResponse
from service.pdf_engine import PdfEngine
from typing import List, Optional
import io

app = FastAPI()

@app.get("/")
def health_check():
    return {"service": "pdf-service", "status": "running"}

@app.post("/protect")
async def protect_pdf(file: UploadFile = File(...), password: str = Form(...)):
    print(f"Received request to protect file: {file.filename}")
    try:
        content = await file.read()
        print(f"File read successfully, size: {len(content)} bytes")
        protected_pdf = PdfEngine.protect_pdf(content, password)
        print(f"PDF protected successfully, size: {len(protected_pdf)} bytes")
        return Response(content=protected_pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=protected_{file.filename}"})
    except Exception as e:
        print(f"Error protecting PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/unlock")
async def unlock_pdf(file: UploadFile = File(...), password: str = Form(...)):
    try:
        content = await file.read()
        unlocked_pdf = PdfEngine.unlock_pdf(content, password)
        return Response(content=unlocked_pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=unlocked_{file.filename}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/split")
async def split_pdf(file: UploadFile = File(...), start: int = Form(...), end: int = Form(...)):
    try:
        content = await file.read()
        split_pdf = PdfEngine.split_pdf(content, start, end)
        return Response(content=split_pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=split_{file.filename}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/merge")
async def merge_pdfs(files: List[UploadFile] = File(...)):
    try:
        files_bytes = []
        for file in files:
            files_bytes.append(await file.read())
        
        merged_pdf = PdfEngine.merge_pdfs(files_bytes)
        return Response(content=merged_pdf, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=merged.pdf"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compress")
async def compress_pdf(file: UploadFile = File(...)):
    try:
        content = await file.read()
        compressed_pdf = PdfEngine.compress_pdf(content)
        return Response(content=compressed_pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=compressed_{file.filename}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/repair")
async def repair_pdf(file: UploadFile = File(...)):
    try:
        content = await file.read()
        repaired_pdf = PdfEngine.repair_pdf(content)
        return Response(content=repaired_pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=repaired_{file.filename}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8004))
    uvicorn.run(app, host="0.0.0.0", port=port)

