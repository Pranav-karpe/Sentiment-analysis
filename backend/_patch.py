import ast

with open('app.py', encoding='utf-8') as f:
    src = f.read()

# ── Replace _run_ocr ─────────────────────────────────────────────────────────
old_start = src.find('def _run_ocr(image_bytes):')
old_end   = src.find('\n\n@app.route("/ocr-image"')
assert old_start != -1, '_run_ocr start not found'
assert old_end   != -1, 'ocr-image route boundary not found'

NEW_RUN_OCR = '''def _run_ocr(image_bytes):
    """
    Extract text from image bytes using Tesseract.
    Returns (text, error_msg). On success text is a str and error_msg is None.
    On failure text is None and error_msg is a user-facing string.
    """
    import io
    from PIL import Image

    if not TESSERACT_AVAILABLE:
        return None, (
            "OCR is not available on this server. "
            "Please copy the text manually and paste it into the text box."
        )

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        img = Image.open(io.BytesIO(image_bytes))  # re-open: verify() consumes the stream
    except Exception as e:
        print(f"[OCR] Image decode failed: {type(e).__name__}: {e}")
        return None, f"Could not read the image file ({type(e).__name__}). Make sure the file is a valid PNG or JPG."

    preprocessed = _preprocess_image(img)
    try:
        # PSM 6: single uniform block of text -- best for screenshots and scans
        text = _pytesseract.image_to_string(preprocessed, config="--psm 6 --oem 3").strip()
        if text:
            print(f"[OCR] Tesseract extracted {len(text)} chars")
            return text, None
        # Second pass on raw image in case preprocessing reduced accuracy
        text = _pytesseract.image_to_string(img, config="--psm 6 --oem 3").strip()
        if text:
            print(f"[OCR] Tesseract extracted {len(text)} chars (raw image)")
            return text, None
        print("[OCR] Tesseract returned empty string")
    except Exception as e:
        print(f"[OCR] Tesseract error: {type(e).__name__}: {e}")
        return None, "OCR failed while processing the image. Please try a clearer image."

    return None, (
        "No text could be extracted from this image. "
        "Try uploading a clearer, higher-resolution image with visible text."
    )'''

src = src[:old_start] + NEW_RUN_OCR + src[old_end:]

# ── Verify no EasyOCR remnants ───────────────────────────────────────────────
assert 'EASYOCR_AVAILABLE' not in src, 'EASYOCR_AVAILABLE still present'
assert '_get_easyocr_reader' not in src, '_get_easyocr_reader still present'
assert 'easyocr' not in src.split('# easyocr removed')[0], 'easyocr import still present'
ast.parse(src)

with open('app.py', 'w', encoding='utf-8', newline='\n') as f:
    f.write(src)

print(f"OK — wrote {len(src)} bytes")
print("EasyOCR references removed, syntax valid")
