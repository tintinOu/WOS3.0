import fitz
import sys
import os
import re

# Add current directory to path so we can import app logic if needed
# But for now I'll just copy the relevant logic to iterate faster or import raw text
sys.path.append(os.getcwd())

from app import extract_from_mitchell_estimate

def analyze_pdf(pdf_path):
    print(f"--- Analyzing {pdf_path} ---")
    
    # Run the actual extraction logic
    try:
        result = extract_from_mitchell_estimate(pdf_path)
        print("\n--- EXTRACTED DATA ---")
        print(f"VIN: {result['vehicle']['vin']}")
        print(f"Plate: {result['vehicle']['plate']}")
        print(f"Year: {result['vehicle']['year']}")
        print(f"Make/Model: {result['vehicle']['makeModel']}")
        print(f"Items Found: {len(result['items'])}")
        for item in result['items']:
            print(f" - {item['type']}: {item['desc']} [{item['partNum']}]")
            
    except Exception as e:
        print(f"Error during extraction: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        analyze_pdf(sys.argv[1])
    else:
        print("Usage: python3 debug_extraction.py <pdf_path>")
