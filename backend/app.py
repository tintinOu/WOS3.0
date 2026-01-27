import os
import tempfile
import json
import re
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
from dotenv import load_dotenv

# Load environment variables from .env file in the same directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)

# Configure CORS for production
# In production, set ALLOWED_ORIGINS to your GitHub Pages URL
allowed_origins = os.getenv('ALLOWED_ORIGINS', '*')
if allowed_origins != '*':
    origins = [o.strip() for o in allowed_origins.split(',')]
else:
    origins = '*'

CORS(app, origins=origins, supports_credentials=True)

from database import (
    get_all_jobs, get_job_by_id, create_job, update_job, delete_job,
    get_all_insurance_cases, get_insurance_case_by_id, create_insurance_case, 
    update_insurance_case, delete_insurance_case
)
from auth import require_auth


def extract_from_mitchell_estimate(pdf_path):
    """
    Extract data from Mitchell Estimate PDF format.
    This uses direct text extraction (no OCR needed for digital PDFs).
    """
    doc = fitz.open(pdf_path)
    full_text = ''
    for page in doc:
        full_text += page.get_text()
    doc.close()
    
    lines = [l.strip() for l in full_text.split('\n') if l.strip()]
    
    result = {
        'customer': {'name': '', 'phone': ''},
        'vehicle': {'year': '', 'makeModel': '', 'plate': '', 'vin': ''},
        'items': [],
        'notes': ''
    }
    
    # Extract VIN (17 character alphanumeric)
    vin_match = re.search(r'VIN\s*\n?\s*([A-HJ-NPR-Z0-9]{17})', full_text)
    if vin_match:
        result['vehicle']['vin'] = vin_match.group(1)
    
    # Extract License Plate (format: XX-XXXXXXX, allowing spaces)
    plate_match = re.search(r'License\s*\n?\s*([A-Z]{2}-[A-Z0-9 ]+)', full_text)
    if plate_match:
        result['vehicle']['plate'] = plate_match.group(1)
    
    # Extract Vehicle Description
    makes_pattern = r'(Honda|Toyota|Ford|Chevrolet|Nissan|Hyundai|Kia|BMW|Mercedes-Benz|Mercedes|Audi|Lexus|Mazda|Subaru|Volkswagen|Jeep|Dodge|GMC|Ram|Acura|Infiniti|Volvo|Porsche|Land\s*Rover|Range\s*Rover|Cadillac|Lincoln|Buick|Chrysler|Tesla|Rivian|Lucid)'
    
    vehicle_match = re.search(r'((?:19|20)\d{2})\s+' + makes_pattern + r'\s+([^\n]+?)(?:\s+\d+\s*Door|\s+Van|\s+\d+\.\d+L)', full_text, re.IGNORECASE)
    if vehicle_match:
        result['vehicle']['year'] = vehicle_match.group(1)
        make = vehicle_match.group(2).strip()
        model_raw = vehicle_match.group(3).strip()
        model = re.sub(r'\s+\d+["\']?\s*WB.*$', '', model_raw, flags=re.IGNORECASE).strip()
        result['vehicle']['makeModel'] = f"{make} {model}"
    
    # Extract job descriptions
    line_items_start = 0
    for i, line in enumerate(lines):
        if 'Line #' in line or 'Description' in line and 'Operation' in ' '.join(lines[max(0,i-1):i+2]):
            line_items_start = i
            break
    
    body_parts = [
        'bumper', 'cover', 'grille', 'hood', 'fender', 'door', 'panel', 
        'rocker', 'quarter', 'trunk', 'tailgate', 'mirror', 'lamp',
        'garnish', 'molding', 'bracket', 'support', 'assembly', 'guard',
        'handle', 'mudguard', 'wheel opening', 'belt', 'sensor', 'pump',
        'glass', 'absorber', 'condenser', 'radiator', 'frame', 'plate',
        'shield', 'lock', 'latch', 'hinge', 'regulator', 'motor', 'pillar'
    ]
    
    exclude_terms = [
        'automatic headlights', 'power door locks', 'power remote', 'power steering',
        'power windows', 'heated mirror', 'lumbar support', 'daytime running', 
        'tonneau cover', 'air conditioning', 'cruise control', 'steering wheel', 
        'bluetooth', 'keyless', '4wd', 'awd', 'cyl gas', 'door utility', 'audio control'
    ]
    
    i = 0
    while i < len(lines):
        line = lines[i]
        if i < line_items_start:
            i += 1
            continue
            
        line_lower = line.lower()
        if any(term in line_lower for term in exclude_terms):
            i += 1
            continue
        
        has_part = any(part in line_lower for part in body_parts) or \
                   'air bag' in line_lower or \
                   'seat belt' in line_lower or \
                   'w/shield' in line_lower
        
        if not has_part:
            i += 1
            continue
            
        if line in ['Front Bumper', 'Front Fender', 'Front Door', 'Rear Bumper', 'Hood', 'Headlamps', 'Fog Lamps', 'Front Lamps', 'Grille', 'Seat Belts', 'Air Bags', 'Cooling', 'Radiator Support', 'Air Bag System']:
            i += 1
            continue
            
        if line in ['Garnish', 'Assembly', 'Support', 'Bracket']:
            i += 1
            continue
        
        search_range = lines[i:min(len(lines), i+5)]
        search_text = ' '.join(search_range)
        
        job_type = None
        if 'Blend' in search_text:
            job_type = 'Blend'
        elif 'Remove /' in search_text and 'Replace' in search_text:
            job_type = 'Replace'
        elif 'Repair' in search_text:
            job_type = 'Repair'
        
        if job_type is None:
            i += 1
            continue
        
        desc = line.strip()
        lines_consumed = 0
        end_keywords = ['Remove', 'Replace', 'Blend', 'Refinish', 'Repair', 'Overhaul', 
                       'Body', 'INC', 'Existing', 'Aftermarket', 'New', 'Yes', 'No']
        
        for kw in ['Remove /', 'Remove', 'Replace']:
            if kw in desc:
                desc = desc.split(kw)[0].strip()
        
        for j in range(i+1, min(len(lines), i+3)):
            next_line = lines[j].strip()
            if (not next_line or next_line in end_keywords or 
                next_line.replace('.', '').replace('#', '').isdigit() or
                any(next_line.startswith(kw) for kw in end_keywords)):
                break
            if len(next_line) > 2 and next_line[0].isupper():
                desc = f"{desc} {next_line}"
                lines_consumed += 1
                break
        
        part_num_val = ''
        if desc and len(desc) > 3 and desc not in ['AUTO', 'Body', 'INC', 'Inc', 'Existing']:
            if job_type == 'Replace':
                for k in range(i, min(len(lines), i+15)):
                    line_k = lines[k].strip()
                    if line_k in ['Body', 'Refinish', 'New', 'Aftermarket', 'Recycled', 'Existing', 'Remove /', 'Replace']:
                        continue
                    if line_k.replace('.', '').replace('#', '').replace('*', '').replace('$', '').isdigit():
                        continue
                        
                    if len(line_k) >= 3 and re.match(r'^[A-Z0-9 -]+$', line_k) and any(c.isdigit() for c in line_k):
                        if line_k not in ['Order', 'Labor', 'Total', 'Sublet', 'Notes']:
                            part_num_val = line_k
                            if k+1 < len(lines):
                                next_p = lines[k+1].strip()
                                if (re.match(r'^[A-Z0-9 -]+$', next_p) and len(next_p) < 15 and
                                    not next_p.startswith('$') and not next_p.startswith('(') and
                                    next_p not in ['Yes', 'No', 'New', 'Body', 'Refinish', '1', '2', '3']):
                                    if not (len(next_p) <= 3 and next_p.isdigit()):
                                        part_num_val = f"{part_num_val} {next_p}"
                            break

            result['items'].append({
                'type': job_type,
                'desc': desc,
                'partNum': part_num_val,
                'customTitle': ''
            })
            
        i += 1 + lines_consumed
    
    seen = set()
    unique_items = []
    for item in result['items']:
        key = (item['type'], item['desc'].lower())
        if key not in seen:
            seen.add(key)
            unique_items.append(item)
    result['items'] = unique_items
    return result


@app.route('/analyze', methods=['POST'])
@require_auth
def analyze_pdf():
    """Main endpoint to analyze uploaded PDF. Protected by OAuth."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        file.save(tmp.name)
        pdf_path = tmp.name
    
    try:
        result = extract_from_mitchell_estimate(pdf_path)
        return jsonify(result)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)


@app.route('/jobs', methods=['GET'])
@require_auth
def list_jobs():
    """Get all jobs. Protected by OAuth."""
    jobs = get_all_jobs()
    return jsonify(jobs)


@app.route('/jobs', methods=['POST'])
@require_auth
def create_new_job():
    """Create a new job from form data or PDF extraction result. Protected by OAuth."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    job_data = {
        'stage': data.get('stage', 'confirmed'),
        'customer_name': data.get('customer', {}).get('name', '') if isinstance(data.get('customer'), dict) else data.get('customer_name', ''),
        'customer_phone': data.get('customer', {}).get('phone', '') if isinstance(data.get('customer'), dict) else data.get('customer_phone', ''),
        'vehicle_year': data.get('vehicle', {}).get('year', '') if isinstance(data.get('vehicle'), dict) else data.get('vehicle_year', ''),
        'vehicle_make_model': data.get('vehicle', {}).get('makeModel', '') if isinstance(data.get('vehicle'), dict) else data.get('vehicle_make_model', ''),
        'vehicle_plate': data.get('vehicle', {}).get('plate', '') if isinstance(data.get('vehicle'), dict) else data.get('vehicle_plate', ''),
        'vehicle_vin': data.get('vehicle', {}).get('vin', '') if isinstance(data.get('vehicle'), dict) else data.get('vehicle_vin', ''),
        'items': data.get('items', []),
        'notes': data.get('notes', ''),
        'start_date': data.get('dates', {}).get('start', '') if isinstance(data.get('dates'), dict) else data.get('start_date', ''),
        'end_date': data.get('dates', {}).get('end', '') if isinstance(data.get('dates'), dict) else data.get('end_date', ''),
        'car_here': data.get('car_here', False),
        'parts_ordered': data.get('parts_ordered', False),
        'parts_arrived': data.get('parts_arrived', False),
        'customer_notified': data.get('customer_notified', False),
        'rental_requested': data.get('rental_requested', False),
        'rental_company': data.get('rental_company', ''),
        'rental_vehicle': data.get('rental_vehicle', ''),
        'rental_confirmation': data.get('rental_confirmation', ''),
        'rental_notes': data.get('rental_notes', ''),
        'timeline': data.get('timeline', []),
    }
    
    job = create_job(job_data)
    return jsonify(job), 201


@app.route('/jobs/<job_id>', methods=['GET'])
@require_auth
def get_single_job(job_id):
    """Get a single job by ID. Protected by OAuth."""
    job = get_job_by_id(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(job)


@app.route('/jobs/<job_id>', methods=['PUT', 'PATCH'])
@require_auth
def update_existing_job(job_id):
    """Update an existing job. Protected by OAuth."""
    job = get_job_by_id(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    updated_job = update_job(job_id, data)
    return jsonify(updated_job)


@app.route('/jobs/<job_id>', methods=['DELETE'])
@require_auth
def delete_existing_job(job_id):
    """Delete a job. Protected by OAuth."""
    deleted = delete_job(job_id)
    if not deleted:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify({'success': True})


@app.route('/file-car-in', methods=['POST'])
@require_auth
def file_car_in_endpoint():
    """File a car-in entry to Google Sheets. Protected by OAuth."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        from google_sheets import file_car_in
        result = file_car_in(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/create-calendar-event', methods=['POST'])
@require_auth
def create_calendar_event_endpoint():
    """Create a Google Calendar event. Protected by OAuth."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        from google_calendar import create_calendar_event
        calendar_id = os.getenv('GOOGLE_CALENDAR_ID', 'primary')
        result = create_calendar_event(data, calendar_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/import-to-calendar', methods=['POST'])
@require_auth
def import_to_calendar_endpoint():
    """Import multiple jobs to Google Calendar. Protected by OAuth."""
    data = request.get_json()
    if not data or 'jobs' not in data:
        return jsonify({'error': 'No jobs provided'}), 400
    try:
        from google_calendar import create_multiple_events
        calendar_id = os.getenv('GOOGLE_CALENDAR_ID', 'primary')
        result = create_multiple_events(data.get('jobs', []), calendar_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- Insurance Supplement Assist Endpoints ---

@app.route('/insurance-cases', methods=['GET'])
@require_auth
def list_insurance_cases():
    """List all insurance cases."""
    cases = get_all_insurance_cases()
    return jsonify(cases)

@app.route('/insurance-cases', methods=['POST'])
@require_auth
def create_new_insurance_case():
    """Create a new insurance case."""
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'error': 'Case name is required'}), 400
    
    case = create_insurance_case(data)
    return jsonify(case), 201

@app.route('/insurance-cases/<case_id>', methods=['GET'])
@require_auth
def get_single_insurance_case(case_id):
    """Get a single insurance case by ID."""
    case = get_insurance_case_by_id(case_id)
    if not case:
        return jsonify({'error': 'Insurance case not found'}), 404
    return jsonify(case)

@app.route('/insurance-cases/<case_id>', methods=['PATCH', 'PUT'])
@require_auth
def update_existing_insurance_case(case_id):
    """Update an insurance case (e.g. adding photos)."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    case = update_insurance_case(case_id, data)
    return jsonify(case)


@app.route('/insurance-cases/<case_id>/photos', methods=['POST'])
@require_auth
def upload_insurance_photo(case_id):
    """Upload a photo to an insurance case."""
    from firebase_config import get_storage_bucket
    from PIL import Image
    import io
    import uuid
    
    case = get_insurance_case_by_id(case_id)
    if not case:
        return jsonify({'error': 'Insurance case not found'}), 404
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Get case name for filename
        case_name = case.get('name', 'case')
        sanitized_name = ''.join(c if c.isalnum() else '_' for c in case_name.lower())
        sanitized_name = '_'.join(filter(None, sanitized_name.split('_')))
        
        # Get next photo index
        current_photos = case.get('photos', [])
        photo_index = len(current_photos) + 1
        
        # Read and compress image
        img = Image.open(file)
        img = img.convert('RGB')  # Ensure RGB for JPEG
        
        # Resize if too large
        max_size = 1920
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Compress to ~200KB
        output = io.BytesIO()
        quality = 85
        img.save(output, format='JPEG', quality=quality, optimize=True)
        
        while output.tell() > 200 * 1024 and quality > 20:
            output = io.BytesIO()
            quality -= 10
            img.save(output, format='JPEG', quality=quality, optimize=True)
        
        output.seek(0)
        
        # Generate filename: casename_1.jpg
        filename = f"{sanitized_name}_{photo_index}.jpg"
        
        # Upload to Firebase Storage
        bucket = get_storage_bucket()
        blob = bucket.blob(f"insurance_photos/{case_id}/{filename}")
        blob.upload_from_file(output, content_type='image/jpeg')
        blob.make_public()
        url = blob.public_url
        
        # Add to case photos
        photo_data = {
            'id': str(uuid.uuid4()),
            'name': filename,
            'url': url,
            'uploaded_at': datetime.now().isoformat()
        }
        current_photos.append(photo_data)
        
        # Update case
        from database import update_insurance_case
        updated_case = update_insurance_case(case_id, {'photos': current_photos})
        
        return jsonify({
            'photo': photo_data,
            'case': updated_case
        }), 201
        
    except Exception as e:
        print(f"Photo upload error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/insurance-cases/<case_id>/photos/<photo_name>', methods=['DELETE'])
@require_auth
def delete_insurance_photo(case_id, photo_name):
    """Delete a specific photo from an insurance case."""
    from firebase_config import get_storage_bucket
    
    case = get_insurance_case_by_id(case_id)
    if not case:
        return jsonify({'error': 'Insurance case not found'}), 404
    
    try:
        # Delete from storage
        bucket = get_storage_bucket()
        blob = bucket.blob(f"insurance_photos/{case_id}/{photo_name}")
        if blob.exists():
            blob.delete()
        
        # Remove from case
        current_photos = [p for p in case.get('photos', []) if p.get('name') != photo_name]
        from database import update_insurance_case
        updated_case = update_insurance_case(case_id, {'photos': current_photos})
        
        return jsonify({'success': True, 'case': updated_case})
    except Exception as e:
        print(f"Photo delete error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/insurance-cases/<case_id>', methods=['DELETE'])
@require_auth
def delete_existing_insurance_case(case_id):
    """Delete an insurance case and its photos."""
    success = delete_insurance_case(case_id)
    if not success:
        return jsonify({'error': 'Insurance case not found'}), 404
    return jsonify({'success': True})


@app.route('/insurance-cases/<case_id>/photos/<photo_name>/download', methods=['GET'])
@require_auth
def download_insurance_photo(case_id, photo_name):
    """Download a specific photo - proxies through backend to avoid CORS issues."""
    from firebase_config import get_storage_bucket
    from flask import Response
    
    case = get_insurance_case_by_id(case_id)
    if not case:
        return jsonify({'error': 'Insurance case not found'}), 404
    
    try:
        bucket = get_storage_bucket()
        blob = bucket.blob(f"insurance_photos/{case_id}/{photo_name}")
        
        if not blob.exists():
            return jsonify({'error': 'Photo not found'}), 404
        
        # Download blob content
        content = blob.download_as_bytes()
        
        # Return with download headers
        response = Response(content, mimetype='image/jpeg')
        response.headers['Content-Disposition'] = f'attachment; filename="{photo_name}"'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response
        
    except Exception as e:
        print(f"Photo download error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint. Public."""
    return jsonify({'status': 'ok', 'database': 'firestore'})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
