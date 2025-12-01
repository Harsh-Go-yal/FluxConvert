import io
import logging
import pikepdf
from typing import Optional, List

logger = logging.getLogger("PdfEngine")
logger.setLevel(logging.INFO)


class PdfEngine:
    """
    Robust PDF utility wrapper compatible with all PikePDF versions.
    Handles protection, unlocking, splitting, merging, compressing, repairing.
    """

    @staticmethod
    def _open_with_fallback(file_bytes: bytes, password: Optional[str] = None):
        """
        Try multiple PikePDF open modes to repair or handle corrupted/scanned PDFs.
        """
        attempts = [
            ({"allow_garbage": True}, "allow_garbage=True"),
            ({"repair": True}, "repair=True"),
            ({}, "no-extra-args"),
        ]

        last_exc = None

        for kwargs, desc in attempts:
            try:
                bio = io.BytesIO(file_bytes)

                if password:
                    pdf = pikepdf.open(bio, password=password, **kwargs)
                else:
                    pdf = pikepdf.open(bio, **kwargs)

                logger.debug(f"Opened PDF with: {desc}")
                return pdf

            except Exception as e:
                last_exc = e

        logger.error("All PDF open attempts failed.")
        raise last_exc

    # -----------------------------------------------------------
    # PROTECT PDF
    # -----------------------------------------------------------
    @staticmethod
    def protect_pdf(file_bytes: bytes, password: str) -> bytes:
        if not password:
            raise ValueError("Password cannot be empty.")

        pdf = None
        try:
            pdf = PdfEngine._open_with_fallback(file_bytes)
            output = io.BytesIO()

            # IMPORTANT:
            # Use ONLY user, owner, R — no permissions object
            # This is the ONLY universally supported combination.
            encryption = pikepdf.Encryption(
                user=password,
                owner=password,
                R=4  # AES-128 → best compatibility, avoids blank PDFs
            )

            pdf.save(output, encryption=encryption)
            logger.info("PDF protected successfully.")
            return output.getvalue()

        except Exception as e:
            logger.exception(f"Error protecting PDF: {e}")
            raise

        finally:
            if pdf:
                try: pdf.close()
                except: pass

    # -----------------------------------------------------------
    # UNLOCK PDF
    # -----------------------------------------------------------
    @staticmethod
    def unlock_pdf(file_bytes: bytes, password: str) -> bytes:
        pdf = None
        try:
            pdf = PdfEngine._open_with_fallback(file_bytes, password)
            output = io.BytesIO()

            # Saving without encryption unlocks the PDF
            pdf.save(output)
            logger.info("PDF unlocked successfully.")
            return output.getvalue()

        except Exception as e:
            logger.exception(f"Error unlocking PDF: {e}")
            raise

        finally:
            if pdf:
                try: pdf.close()
                except: pass

    # -----------------------------------------------------------
    # SPLIT PDF
    # -----------------------------------------------------------
    @staticmethod
    def split_pdf(file_bytes: bytes, start: int, end: int) -> bytes:
        pdf = None
        try:
            pdf = PdfEngine._open_with_fallback(file_bytes)
            new_pdf = pikepdf.new()

            page_count = len(pdf.pages)
            start_idx = max(0, start - 1)
            end_idx = min(page_count, end)

            if start_idx >= end_idx:
                raise ValueError("Invalid page range.")

            for i in range(start_idx, end_idx):
                new_pdf.pages.append(pdf.pages[i])

            output = io.BytesIO()
            new_pdf.save(output)
            logger.info("PDF split successfully.")
            return output.getvalue()

        except Exception as e:
            logger.exception(f"Error splitting PDF: {e}")
            raise

        finally:
            if pdf:
                try: pdf.close()
                except: pass

    # -----------------------------------------------------------
    # MERGE PDFs
    # -----------------------------------------------------------
    @staticmethod
    def merge_pdfs(files_bytes: List[bytes]) -> bytes:
        try:
            new_pdf = pikepdf.new()

            for file_bytes in files_bytes:
                pdf = None
                try:
                    pdf = PdfEngine._open_with_fallback(file_bytes)
                    new_pdf.pages.extend(pdf.pages)
                finally:
                    if pdf:
                        try: pdf.close()
                        except: pass

            output = io.BytesIO()
            new_pdf.save(output)
            logger.info("PDFs merged successfully.")
            return output.getvalue()

        except Exception as e:
            logger.exception(f"Error merging PDFs: {e}")
            raise

    # -----------------------------------------------------------
    # COMPRESS PDF
    # -----------------------------------------------------------
    @staticmethod
    def compress_pdf(file_bytes: bytes) -> bytes:
        pdf = None
        try:
            pdf = PdfEngine._open_with_fallback(file_bytes)

            output = io.BytesIO()
            pdf.save(output, compress_streams=True)

            logger.info("PDF compressed successfully.")
            return output.getvalue()

        except Exception as e:
            logger.exception(f"Error compressing PDF: {e}")
            raise

        finally:
            if pdf:
                try: pdf.close()
                except: pass

    # -----------------------------------------------------------
    # REPAIR PDF
    # -----------------------------------------------------------
    @staticmethod
    def repair_pdf(file_bytes: bytes) -> bytes:
        pdf = None
        try:
            pdf = PdfEngine._open_with_fallback(file_bytes)

            output = io.BytesIO()
            pdf.save(output)

            logger.info("PDF repaired successfully.")
            return output.getvalue()

        except Exception as e:
            logger.exception(f"Error repairing PDF: {e}")
            raise

        finally:
            if pdf:
                try: pdf.close()
                except: pass
