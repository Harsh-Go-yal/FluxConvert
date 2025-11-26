import pikepdf
import io
from fastapi.responses import StreamingResponse

class PdfEngine:
    @staticmethod
    def protect_pdf(file_bytes: bytes, password: str) -> bytes:
        with pikepdf.open(io.BytesIO(file_bytes)) as pdf:
            output = io.BytesIO()
            pdf.save(output, encryption=pikepdf.Encryption(owner=password, user=password, R=6))
            return output.getvalue()

    @staticmethod
    def unlock_pdf(file_bytes: bytes, password: str) -> bytes:
        with pikepdf.open(io.BytesIO(file_bytes), password=password) as pdf:
            output = io.BytesIO()
            pdf.save(output)
            return output.getvalue()

    @staticmethod
    def split_pdf(file_bytes: bytes, start: int, end: int) -> bytes:
        with pikepdf.open(io.BytesIO(file_bytes)) as pdf:
            new_pdf = pikepdf.new()
            # Adjust 1-based index to 0-based
            page_count = len(pdf.pages)
            start_idx = max(0, start - 1)
            end_idx = min(page_count, end)
            
            for i in range(start_idx, end_idx):
                new_pdf.pages.append(pdf.pages[i])
            
            output = io.BytesIO()
            new_pdf.save(output)
            return output.getvalue()

    @staticmethod
    def merge_pdfs(files_bytes: list[bytes]) -> bytes:
        new_pdf = pikepdf.new()
        for file_bytes in files_bytes:
            with pikepdf.open(io.BytesIO(file_bytes)) as pdf:
                new_pdf.pages.extend(pdf.pages)
        
        output = io.BytesIO()
        new_pdf.save(output)
        return output.getvalue()

    @staticmethod
    def compress_pdf(file_bytes: bytes) -> bytes:
        # Simple compression by removing unused objects and streams
        with pikepdf.open(io.BytesIO(file_bytes)) as pdf:
            output = io.BytesIO()
            pdf.save(output, compress_streams=True) # pikepdf default is usually efficient
            return output.getvalue()

    @staticmethod
    def repair_pdf(file_bytes: bytes) -> bytes:
        # Opening and saving with pikepdf often repairs minor corruptions
        with pikepdf.open(io.BytesIO(file_bytes)) as pdf:
            output = io.BytesIO()
            pdf.save(output)
            return output.getvalue()
