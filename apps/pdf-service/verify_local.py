import io
import sys
import os

# Add current directory to path so we can import service
sys.path.append(os.getcwd())

try:
    from service.pdf_engine import PdfEngine
except ImportError:
    # Try adding the parent directory if running from inside apps/pdf-service
    sys.path.append(os.path.join(os.getcwd(), '..'))
    from service.pdf_engine import PdfEngine

def create_dummy_pdf():
    import PyPDF2
    writer = PyPDF2.PdfWriter()
    writer.add_blank_page(width=100, height=100)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()

def test_protection_and_unlocking():
    print("Generating dummy PDF...")
    original_pdf = create_dummy_pdf()
    password = "securepassword"
    
    print("Testing protect_pdf...")
    try:
        protected_pdf = PdfEngine.protect_pdf(original_pdf, password)
        print(f"Protected PDF size: {len(protected_pdf)} bytes")
    except Exception as e:
        print(f"FAILED: protect_pdf raised exception: {e}")
        sys.exit(1)

    print("Testing unlock_pdf with CORRECT password...")
    try:
        unlocked_pdf = PdfEngine.unlock_pdf(protected_pdf, password)
        print(f"Unlocked PDF size: {len(unlocked_pdf)} bytes")
    except Exception as e:
        print(f"FAILED: unlock_pdf failed with correct password: {e}")
        sys.exit(1)

    print("Testing unlock_pdf with WRONG password...")
    try:
        PdfEngine.unlock_pdf(protected_pdf, "wrongpassword")
        print("FAILED: unlock_pdf did NOT raise exception for wrong password")
        sys.exit(1)
    except ValueError as e:
        if str(e) == "Incorrect password":
            print("SUCCESS: Caught expected 'Incorrect password' error.")
        else:
            print(f"FAILED: Caught unexpected ValueError: {e}")
            sys.exit(1)
    except Exception as e:
        print(f"FAILED: Caught unexpected exception type: {type(e).__name__}: {e}")
        sys.exit(1)

    print("\nALL LOCAL TESTS PASSED!")

if __name__ == "__main__":
    test_protection_and_unlocking()
