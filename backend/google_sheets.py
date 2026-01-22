"""
Google Sheets Integration with Gemini AI Summarization

Appends work order data to a monthly Google Sheet with AI-generated summaries.
"""

import os
from datetime import datetime
import google.generativeai as genai
from googleapiclient.discovery import build
from google.oauth2 import service_account

# Scopes needed for Drive (search files) and Sheets (append data)
SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets'
]


def get_credentials():
    """Load Google service account credentials."""
    creds_path = os.getenv('GOOGLE_CREDENTIALS_PATH')
    if not creds_path or not os.path.exists(creds_path):
        raise ValueError(f"Google credentials file not found. Set GOOGLE_CREDENTIALS_PATH in .env")
    
    credentials = service_account.Credentials.from_service_account_file(
        creds_path, scopes=SCOPES
    )
    return credentials


def generate_case_summary(job_data):
    """
    Use Gemini AI to generate a concise case summary.
    Example output: "2023 TESLA MODEL Y LF DMG"
    """
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in .env")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # Build repair items description
    items_desc = ""
    items_list = job_data.get('items', [])
    for item in items_list:
        items_desc += f"- {item.get('type', 'Work')}: {item.get('desc', 'Unknown')}\n"
    
    if not items_desc:
        items_desc = "- General repair work"
    
    # Rule-based area extraction (more reliable than AI)
    area = extract_damage_area(items_list)
    
    # Get vehicle info
    year = job_data.get('vehicle_year', '')
    make_model = job_data.get('vehicle_make_model', '').upper()
    
    # If we have area from rule-based extraction, just format it
    if area:
        return f"{year} {make_model} {area} DMG"
    
    # Fallback to AI for complex cases
    prompt = f"""Summarize this repair job in format: "YEAR MAKE MODEL AREA DMG"
AREA must be: LF/RF/LR/RR (corners), FRT/RR (front/rear), L/R (sides)

Vehicle: {year} {make_model}
Items: {items_desc}

Output ONLY the summary, example: "2023 TOYOTA CAMRY LF DMG" """

    try:
        response = model.generate_content(prompt)
        summary = response.text.strip().upper()
        summary = summary.replace('"', '').replace("'", "").strip()
        if len(summary) > 55:
            summary = summary[:55]
        return summary
    except Exception as e:
        print(f"Gemini API error: {e}")
        return f"{year} {make_model} DMG"


def extract_damage_area(items):
    """
    Extract damage area from repair items using pattern matching.
    Returns abbreviation like LF, RF, FRT, etc.
    """
    if not items:
        return ""
    
    # Combine all descriptions
    all_desc = " ".join([item.get('desc', '').lower() for item in items])
    
    # Check for specific areas (order matters - check specific first)
    areas = set()
    
    # Right Front (check first - "r frt" means Right Front)
    if any(x in all_desc for x in ['right front', 'r frt', 'rf ', 'right fender', 'right headlight', 'right fog', 'r front']):
        areas.add('RF')
    # Left Front
    if any(x in all_desc for x in ['left front', 'l frt', 'lf ', 'left fender', 'left headlight', 'left fog', 'l front']):
        areas.add('LF')
    # Right Rear
    if any(x in all_desc for x in ['right rear', 'r rr', 'rr ', 'right quarter', 'right tail', 'r rear']):
        areas.add('RR')
    # Left Rear
    if any(x in all_desc for x in ['left rear', 'l rr', 'lr ', 'left quarter', 'left tail', 'l rear']):
        areas.add('LR')
    # Front only (no left/right specified)
    if any(x in all_desc for x in ['front bumper', 'grille', 'hood', 'radiator']) and 'RF' not in areas and 'LF' not in areas:
        areas.add('FRT')
    # Rear only (no left/right specified)
    if any(x in all_desc for x in ['rear bumper', 'trunk', 'tailgate', 'liftgate']) and 'RR' not in areas and 'LR' not in areas:
        areas.add('RR')
    # Left side general
    if ('left' in all_desc or 'l ' in all_desc) and 'LF' not in areas and 'LR' not in areas:
        areas.add('L')
    # Right side general
    if ('right' in all_desc or ('r ' in all_desc and 'r frt' not in all_desc and 'r rr' not in all_desc)) and 'RF' not in areas and 'RR' not in areas:
        areas.add('R')
    
    # Return the most specific area found
    if len(areas) == 1:
        return areas.pop()
    elif len(areas) > 1:
        # Multiple areas - return combined (prefer corners over general)
        priority = ['LF', 'RF', 'LR', 'RR', 'FRT', 'RR', 'L', 'R']
        for p in priority:
            if p in areas:
                return p
    
    return ""


def find_monthly_spreadsheet(drive_service, year, month):
    """
    Search Google Drive for a spreadsheet matching the current month.
    Tries formats: 2026-01, 2026-1, 2026/01, 2026/1
    """
    name_patterns = [
        f"{year}-{month:02d}",  # 2026-01
        f"{year}-{month}",      # 2026-1
        f"{year}/{month:02d}",  # 2026/01
        f"{year}/{month}",      # 2026/1
    ]
    
    for name in name_patterns:
        # Search for spreadsheet with exact name
        query = f"name='{name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
        try:
            results = drive_service.files().list(
                q=query, 
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            files = results.get('files', [])
            if files:
                print(f"Found spreadsheet: {files[0]['name']} (ID: {files[0]['id']})")
                return files[0]['id']
        except Exception as e:
            print(f"Drive search error for '{name}': {e}")
            continue
    
    return None


def append_to_sheet(spreadsheet_id, plate, summary, sheets_service):
    """
    Find the first blank row in column D, then write:
    - Column C = License Plate
    - Column D = AI Summary
    (Column B has prefilled sequence numbers, so we don't touch it)
    """
    # First, get the actual sheet name (first tab)
    try:
        spreadsheet = sheets_service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        first_sheet = spreadsheet['sheets'][0]['properties']['title']
        print(f"Using sheet tab: {first_sheet}")
    except Exception as e:
        print(f"Could not get sheet info, using default: {e}")
        first_sheet = "Sheet1"
    
    # Read column D to find the first blank row
    try:
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=f"'{first_sheet}'!D:D"
        ).execute()
        values = result.get('values', [])
        
        # Find first blank row (1-indexed for sheets)
        # Skip row 1 (header), start checking from row 2
        first_blank_row = 2  # Default to row 2 (first data row after header)
        for i, row in enumerate(values):
            if i == 0:  # Skip header row
                continue
            if not row or not row[0] or row[0].strip() == '':
                first_blank_row = i + 1  # Convert to 1-indexed
                break
        else:
            # All rows have data, append to next row (but at least row 2)
            first_blank_row = max(len(values) + 1, 2)
        
        print(f"First blank row in column D: {first_blank_row}")
        
    except Exception as e:
        print(f"Could not read column D, defaulting to row 2: {e}")
        first_blank_row = 2  # Skip header row
    
    # Write plate to C and summary to D on the same row
    range_name = f"'{first_sheet}'!C{first_blank_row}:D{first_blank_row}"
    
    values = [[plate, summary]]
    body = {'values': values}
    
    try:
        result = sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption='USER_ENTERED',
            body=body
        ).execute()
        
        updated_range = result.get('updatedRange', 'unknown')
        print(f"Updated cells: {updated_range}")
        return True
    except Exception as e:
        print(f"Sheets update error: {e}")
        raise


def file_car_in(job_data):
    """
    Main function to file a car-in entry.
    1. Generate AI summary
    2. Find the monthly spreadsheet
    3. Append license plate + summary
    """
    print(f"Filing car-in for: {job_data.get('vehicle_plate', 'Unknown')}")
    
    # Get credentials
    credentials = get_credentials()
    
    # Build services
    drive_service = build('drive', 'v3', credentials=credentials)
    sheets_service = build('sheets', 'v4', credentials=credentials)
    
    # Get current month
    now = datetime.now()
    year = now.year
    month = now.month
    
    # Find the monthly spreadsheet
    spreadsheet_id = find_monthly_spreadsheet(drive_service, year, month)
    if not spreadsheet_id:
        raise ValueError(f"Could not find spreadsheet for {year}-{month:02d}")
    
    # Generate AI summary
    summary = generate_case_summary(job_data)
    print(f"Generated summary: {summary}")
    
    # Get license plate
    plate = job_data.get('vehicle_plate', 'NO PLATE')
    
    # Append to sheet
    append_to_sheet(spreadsheet_id, plate, summary, sheets_service)
    
    return {
        'success': True,
        'summary': summary,
        'plate': plate,
        'spreadsheet_id': spreadsheet_id
    }


# For testing
if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()
    
    test_job = {
        'vehicle_year': '2023',
        'vehicle_make_model': 'Tesla Model Y',
        'vehicle_plate': 'ABC-123',
        'items': [
            {'type': 'Replace', 'desc': 'Front Bumper Cover'},
            {'type': 'Repair', 'desc': 'Left Fender'},
            {'type': 'Blend', 'desc': 'Left Front Door'}
        ]
    }
    
    try:
        result = file_car_in(test_job)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Error: {e}")
