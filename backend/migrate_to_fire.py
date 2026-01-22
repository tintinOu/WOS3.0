"""
Data Migration Utility: SQLite to Firestore
This script moves existing work orders from your local jobs.db to Firebase Firestore.
"""

import sqlite3
import json
import os
from datetime import datetime
from firebase_config import get_jobs_collection, init_firebase

# Path to local database
DB_PATH = os.path.join(os.path.dirname(__file__), 'jobs.db')

def row_to_dict(row):
    """Convert a sqlite3.Row to a dictionary with proper type conversions."""
    d = dict(row)
    
    # Convert items from JSON string to list
    if d.get('items'):
        try:
            d['items'] = json.loads(d['items'])
        except (json.JSONDecodeError, TypeError):
            d['items'] = []
    else:
        d['items'] = []
    
    # Convert timeline from JSON string to list
    if d.get('timeline'):
        try:
            d['timeline'] = json.loads(d['timeline'])
        except (json.JSONDecodeError, TypeError):
            d['timeline'] = []
    else:
        d['timeline'] = []
    
    # Convert boolean fields
    d['car_here'] = bool(d.get('car_here', 0))
    d['parts_ordered'] = bool(d.get('parts_ordered', 0))
    d['parts_arrived'] = bool(d.get('parts_arrived', 0))
    d['customer_notified'] = bool(d.get('customer_notified', 0))
    d['rental_requested'] = bool(d.get('rental_requested', 0))
    
    return d

def migrate():
    print(f"--- Starting Migration from {DB_PATH} ---")
    
    if not os.path.exists(DB_PATH):
        print(f"Error: Could not find {DB_PATH}. Make sure you are in the backend directory.")
        return

    # 1. Connect to SQLite
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM jobs')
    old_jobs = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    
    print(f"Found {len(old_jobs)} jobs in local database.")

    # 2. Initialize Firestore
    try:
        init_firebase()
        jobs_ref = get_jobs_collection()
    except Exception as e:
        print(f"Failed to initialize Firebase: {e}")
        return

    # 3. Upload to Firestore
    success_count = 0
    error_count = 0
    
    for job in old_jobs:
        try:
            # We remove the local integer ID to let Firestore generate its own UUID
            # or we can keep it as a field if desired. Here we let Firestore generate.
            local_id = job.pop('id', None)
            
            # Map any potentially missing fields to defaults
            job['updated_at'] = job.get('updated_at', datetime.now().isoformat())
            job['created_at'] = job.get('created_at', datetime.now().isoformat())
            
            # Add to Firestore
            jobs_ref.add(job)
            print(f"✅ Migrated job for: {job.get('customer_name', 'Unknown')}")
            success_count += 1
        except Exception as e:
            print(f"❌ Failed to migrate job (Local ID: {local_id}): {e}")
            error_count += 1

    print(f"\n--- Migration Complete ---")
    print(f"Success: {success_count}")
    print(f"Errors: {error_count}")
    print(f"Refresh your website to see the results!")

if __name__ == "__main__":
    migrate()
