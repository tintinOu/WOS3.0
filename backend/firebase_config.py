"""
Firebase Configuration Module
Initializes Firebase Admin SDK for Firestore database access
"""

import os
import json
import firebase_admin
from firebase_admin import credentials, firestore


# Firebase initialization state
_firebase_initialized = False
_db = None


# Collection names
JOBS_COLLECTION = 'jobs'
INSURANCE_COLLECTION = 'insurance_cases'


def get_jobs_collection():
    """Get reference to the jobs collection."""
    db = get_db()
    return db.collection(JOBS_COLLECTION)


def get_insurance_collection():
    """Get reference to the insurance cases collection."""
    db = get_db()
    return db.collection(INSURANCE_COLLECTION)


def get_storage_bucket():
    """Get reference to the Firebase Storage bucket."""
    from firebase_admin import storage
    # Initialize Firebase if not already
    get_db()
    
    # Use the exact bucket name from Firebase Console
    bucket_name = "wos3-485114.firebasestorage.app"
    
    return storage.bucket(bucket_name)

def get_db():
    """
    Get the Firestore database client.
    Initializes Firebase if not already initialized.
    """
    if not _firebase_initialized:
        init_firebase()
    return _db

def init_firebase():
    """
    Initialize Firebase Admin SDK.
    Tries multiple credential sources in order:
    1. GOOGLE_APPLICATION_CREDENTIALS environment variable
    2. FIREBASE_CREDENTIALS_JSON environment variable (base64 or raw JSON)
    3. Local credentials file for development
    """
    global _firebase_initialized, _db
    
    if _firebase_initialized:
        return _db
    
    cred = None
    
    # Get the default bucket name from project ID
    project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'wos3-485114')
    bucket_name = f"{project_id}.firebasestorage.app"
    
    # Method 1: Default credentials (Cloud Run will auto-inject service account)
    if os.getenv('K_SERVICE'):  # Running on Cloud Run
        try:
            firebase_admin.initialize_app(options={
                'storageBucket': bucket_name
            })
            _firebase_initialized = True
            _db = firestore.client()
            print("Firebase initialized with default Cloud Run credentials")
            return _db
        except Exception as e:
            print(f"Failed to init with default credentials: {e}")
    
    # Method 2: GOOGLE_APPLICATION_CREDENTIALS file path
    creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if creds_path and os.path.exists(creds_path):
        try:
            cred = credentials.Certificate(creds_path)
        except Exception as e:
            print(f"Failed to load credentials from file: {e}")
    
    # Method 3: FIREBASE_CREDENTIALS_JSON as JSON string
    if not cred:
        creds_json = os.getenv('FIREBASE_CREDENTIALS_JSON')
        if creds_json:
            try:
                creds_dict = json.loads(creds_json)
                cred = credentials.Certificate(creds_dict)
            except Exception as e:
                print(f"Failed to parse FIREBASE_CREDENTIALS_JSON: {e}")
    
    # Method 4: Local development file (check both common names)
    if not cred:
        for filename in ['firebase-credentials.json', 'google-credentials.json']:
            local_path = os.path.join(os.path.dirname(__file__), filename)
            if os.path.exists(local_path):
                try:
                    cred = credentials.Certificate(local_path)
                    print(f"Found credentials in {filename}")
                    break
                except Exception as e:
                    print(f"Failed to load credentials from {filename}: {e}")
    
    if cred:
        try:
            firebase_admin.initialize_app(cred, {
                'storageBucket': bucket_name
            })
            _firebase_initialized = True
            _db = firestore.client()
            print("Firebase initialized successfully")
            return _db
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")
            raise
    else:
        raise RuntimeError(
            "No Firebase credentials found. Set GOOGLE_APPLICATION_CREDENTIALS "
            "or FIREBASE_CREDENTIALS_JSON environment variable."
        )
