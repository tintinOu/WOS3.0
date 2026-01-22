"""
Google Cloud Firestore Database Module for Jobs Management.
Migrated from SQLite for production deployment on Google Cloud.
"""

import json
import os
from datetime import datetime
from firebase_config import get_jobs_collection, get_insurance_collection, get_storage_bucket, init_firebase

# Insurance Case Operations

def insurance_doc_to_dict(doc):
    """Convert an Insurance Case DocumentSnapshot to a dictionary with ID."""
    if not doc.exists:
        return None
    data = doc.to_dict()
    data['id'] = str(doc.id)
    
    if 'photos' not in data or data['photos'] is None:
        data['photos'] = []
        
    return data

def get_all_insurance_cases():
    """Retrieve all insurance cases from Firestore."""
    insurance_ref = get_insurance_collection()
    docs = insurance_ref.order_by('updated_at', direction='DESCENDING').stream()
    return [insurance_doc_to_dict(doc) for doc in docs]

def get_insurance_case_by_id(case_id):
    """Retrieve a single insurance case by ID."""
    insurance_ref = get_insurance_collection()
    doc = insurance_ref.document(str(case_id)).get()
    return insurance_doc_to_dict(doc)

def create_insurance_case(data):
    """Create a new insurance case in Firestore."""
    insurance_ref = get_insurance_collection()
    
    now = datetime.now().isoformat()
    
    case_data = {
        'name': data.get('name', 'Unnamed Case'),
        'photos': data.get('photos', []), # List of {id, url, name, uploaded_at}
        'created_at': now,
        'updated_at': now
    }
    
    update_time, doc_ref = insurance_ref.add(case_data)
    return get_insurance_case_by_id(doc_ref.id)

def update_insurance_case(case_id, data):
    """Update an insurance case."""
    insurance_ref = get_insurance_collection()
    doc_ref = insurance_ref.document(str(case_id))
    
    updates = {}
    if 'name' in data:
        updates['name'] = data['name']
    if 'photos' in data:
        updates['photos'] = data['photos']
        
    if updates:
        updates['updated_at'] = datetime.now().isoformat()
        doc_ref.update(updates)
        
    return get_insurance_case_by_id(case_id)

def delete_insurance_case(case_id):
    """Delete an insurance case and its associated photos from storage."""
    case = get_insurance_case_by_id(case_id)
    if not case:
        return False
        
    # Delete photos from storage
    try:
        bucket = get_storage_bucket()
        for photo in case.get('photos', []):
            try:
                # Extracts filename from URL or uses the stored name if it's the path
                # For simplicity, if we store the full path/name in Firebase Storage, 
                # we use that.
                if 'name' in photo:
                    blob = bucket.blob(f"insurance_photos/{case_id}/{photo['name']}")
                    if blob.exists():
                        blob.delete()
            except Exception as e:
                print(f"Failed to delete photo {photo.get('name')}: {e}")
    except Exception as e:
        print(f"Storage error during case deletion: {e}")
        
    # Delete Firestore document
    insurance_ref = get_insurance_collection()
    insurance_ref.document(str(case_id)).delete()
    return True

# Initialize Firebase
try:
    init_firebase()
except Exception as e:
    print(f"Warning: Firebase initialization failed: {e}")
    print("Ensure FIREBASE_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS is set.")

def doc_to_dict(doc):
    """Convert a Firestore DocumentSnapshot to a dictionary with ID."""
    if not doc.exists:
        return None
    data = doc.to_dict()
    # Ensure ID is a string for consistency
    data['id'] = str(doc.id)
    
    # Ensure items and timeline are lists
    if 'items' not in data or data['items'] is None:
        data['items'] = []
    if 'timeline' not in data or data['timeline'] is None:
        data['timeline'] = []
        
    # Convert boolean fields if they are stored as ints/strings
    bool_fields = ['car_here', 'parts_ordered', 'parts_arrived', 'customer_notified', 'rental_requested']
    for field in bool_fields:
        if field in data:
            data[field] = bool(data[field])
        else:
            data[field] = False
            
    return data

def get_all_jobs():
    """Retrieve all jobs from Firestore."""
    jobs_ref = get_jobs_collection()
    # Order by created_at descending
    docs = jobs_ref.order_by('created_at', direction='DESCENDING').stream()
    return [doc_to_dict(doc) for doc in docs]

def get_job_by_id(job_id):
    """Retrieve a single job by ID from Firestore."""
    # job_id is usually a string in Firestore (auto-generated ID)
    jobs_ref = get_jobs_collection()
    doc = jobs_ref.document(str(job_id)).get()
    return doc_to_dict(doc)

def create_job(data):
    """Create a new job in Firestore."""
    jobs_ref = get_jobs_collection()
    
    # All new jobs start at 'confirmed' stage
    initial_stage = data.get('stage', 'confirmed')
    
    now = datetime.now().isoformat()
    
    # Create initial timeline if not provided
    timeline = data.get('timeline', [{
        'stage': 'confirmed',
        'timestamp': now,
        'label': 'Case Created'
    }])
    
    # Prepare data for Firestore
    job_data = {
        'stage': initial_stage,
        'car_here': bool(data.get('car_here', False)),
        'parts_ordered': bool(data.get('parts_ordered', False)),
        'parts_arrived': bool(data.get('parts_arrived', False)),
        'customer_notified': bool(data.get('customer_notified', False)),
        'rental_requested': bool(data.get('rental_requested', False)),
        'customer_name': data.get('customer_name', ''),
        'customer_phone': data.get('customer_phone', ''),
        'vehicle_year': data.get('vehicle_year', ''),
        'vehicle_make_model': data.get('vehicle_make_model', ''),
        'vehicle_plate': data.get('vehicle_plate', ''),
        'vehicle_vin': data.get('vehicle_vin', ''),
        'items': data.get('items', []),
        'notes': data.get('notes', ''),
        'start_date': data.get('start_date', ''),
        'end_date': data.get('end_date', ''),
        'rental_company': data.get('rental_company', ''),
        'rental_vehicle': data.get('rental_vehicle', ''),
        'rental_confirmation': data.get('rental_confirmation', ''),
        'rental_notes': data.get('rental_notes', ''),
        'rental_start_date': data.get('rental_start_date', ''),
        'timeline': timeline,
        'created_at': now,
        'updated_at': now
    }
    
    # Add to Firestore
    update_time, doc_ref = jobs_ref.add(job_data)
    
    return get_job_by_id(doc_ref.id)

def update_job(job_id, data):
    """Update an existing job in Firestore."""
    jobs_ref = get_jobs_collection()
    doc_ref = jobs_ref.document(str(job_id))
    
    # Prepare updates
    updates = {}
    
    field_mapping = [
        'stage', 'car_here', 'parts_ordered', 'parts_arrived', 
        'customer_notified', 'rental_requested', 'customer_name', 
        'customer_phone', 'vehicle_year', 'vehicle_make_model', 
        'vehicle_plate', 'vehicle_vin', 'notes', 'start_date', 
        'end_date', 'rental_company', 'rental_vehicle', 
        'rental_confirmation', 'rental_notes', 'rental_start_date',
        'items', 'timeline'
    ]
    
    for field in field_mapping:
        if field in data:
            updates[field] = data[field]
            
    if updates:
        updates['updated_at'] = datetime.now().isoformat()
        doc_ref.update(updates)
        
    return get_job_by_id(job_id)

def delete_job(job_id):
    """Delete a job from Firestore."""
    jobs_ref = get_jobs_collection()
    # Check if exists first
    doc_ref = jobs_ref.document(str(job_id))
    if doc_ref.get().exists:
        doc_ref.delete()
        return True
    return False

# init_db is not needed for Firestore as collections/documents are created on use,
# but we keep it for backward compatibility with app.py imports
def init_db():
    """No-op for Firestore migration."""
    pass
