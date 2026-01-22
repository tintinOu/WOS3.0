"""
Authentication Module for Google OAuth Token Verification
Provides middleware and decorators for protecting API endpoints
"""

import os
from functools import wraps
from flask import request, jsonify, g

# Google OAuth verification
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests


# Get allowed client IDs from environment
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')


def verify_google_token(token):
    """
    Verify a Google OAuth ID token and extract user info.
    
    Args:
        token: The ID token from Google Sign-In
        
    Returns:
        dict: User info (sub, email, name, picture) or None if invalid
    """
    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        # Token is valid, return user info
        return {
            'id': idinfo.get('sub'),
            'email': idinfo.get('email'),
            'name': idinfo.get('name'),
            'picture': idinfo.get('picture'),
            'email_verified': idinfo.get('email_verified', False)
        }
    except ValueError as e:
        # Token is invalid
        print(f"Token verification failed: {e}")
        return None


def require_auth(f):
    """
    Decorator to require authentication on an endpoint.
    Expects Authorization header with Bearer token.
    
    Sets g.user with the authenticated user info.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401
        
        token = auth_header.split(' ', 1)[1]
        
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        user = verify_google_token(token)
        
        if not user:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Store user in Flask's g object for access in the route
        g.user = user
        
        return f(*args, **kwargs)
    
    return decorated_function


def optional_auth(f):
    """
    Decorator that checks for auth but doesn't require it.
    Sets g.user to the user info if authenticated, None otherwise.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]
            user = verify_google_token(token)
            g.user = user
        else:
            g.user = None
        
        return f(*args, **kwargs)
    
    return decorated_function


def get_current_user():
    """
    Get the current authenticated user from Flask's g object.
    Returns None if not authenticated.
    """
    return getattr(g, 'user', None)
