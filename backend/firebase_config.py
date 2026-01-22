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
    
    # Method 1: Default credentials (Cloud Run will auto-inject service account)
    if os.getenv('K_SERVICE'):  # Running on Cloud Run
        try:
            firebase_admin.initialize_app()
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
    
    # Method 4: Local development file (same as google-credentials.json)
    if not cred:
        local_path = os.path.join(os.path.dirname(__file__), 'firebase-credentials.json')
        if os.path.exists(local_path):
            try:
                cred = credentials.Certificate(local_path)
            except Exception as e:
                print(f"Failed to load local credentials: {e}")
    
    if cred:
        try:
            firebase_admin.initialize_app(cred)
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


def get_db():
    """
    Get the Firestore database client.
    Initializes Firebase if not already initialized.
    """
    if not _firebase_initialized:
        init_firebase()
    return _db


# Collection names
JOBS_COLLECTION = 'jobs'


def get_jobs_collection():
    """Get reference to the jobs collection."""
    db = get_db()
    return db.collection(JOBS_COLLECTION)
