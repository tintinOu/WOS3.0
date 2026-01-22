"""
Google Calendar Integration

Creates calendar events for work orders with job details.
"""

import os
from datetime import datetime, timedelta
from googleapiclient.discovery import build
from google.oauth2 import service_account

# Scopes needed for Calendar
CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
]


def get_calendar_credentials():
    """Load Google service account credentials with Calendar scope."""
    creds_path = os.getenv('GOOGLE_CREDENTIALS_PATH')
    if not creds_path or not os.path.exists(creds_path):
        raise ValueError(f"Google credentials file not found. Set GOOGLE_CREDENTIALS_PATH in .env")
    
    credentials = service_account.Credentials.from_service_account_file(
        creds_path, scopes=CALENDAR_SCOPES
    )
    return credentials


def create_calendar_event(job_data, calendar_id='primary'):
    """
    Create a Google Calendar event for a job.
    
    Args:
        job_data: dict with job details (vehicle, customer, dates, items)
        calendar_id: Calendar ID to create event in (default 'primary')
    
    Returns:
        dict with event details including link
    """
    credentials = get_calendar_credentials()
    service = build('calendar', 'v3', credentials=credentials)
    
    # Build event title: YEAR MAKE MODEL
    vehicle_year = job_data.get('vehicle_year', '')
    vehicle_make_model = job_data.get('vehicle_make_model', 'Unknown Vehicle')
    event_title = f"{vehicle_year} {vehicle_make_model}".strip()
    
    # Build description
    license_plate = job_data.get('vehicle_plate', 'N/A')
    customer_name = job_data.get('customer_name', 'Unknown Customer')
    customer_phone = job_data.get('customer_phone', 'N/A')
    
    # Build repair items list
    items = job_data.get('items', [])
    repair_list = '\n'.join([f"{item.get('desc', 'Unknown item')}" for item in items])
    
    description = f"""{license_plate}
{customer_name} | {customer_phone}
------
{repair_list}"""
    
    # Get start date from job
    start_date = job_data.get('start_date')
    
    if not start_date:
        # Default to today if no start date
        start_date = datetime.now().strftime('%Y-%m-%d')
    
    # For all-day events, end date is exclusive (next day = same day event)
    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
    end_date = (start_dt + timedelta(days=1)).strftime('%Y-%m-%d')
    
    # Create single-day all-day event on start date only
    event = {
        'summary': event_title,
        'description': description,
        'start': {
            'date': start_date,  # All-day event
            'timeZone': 'America/New_York',
        },
        'end': {
            'date': end_date,  # Next day (exclusive) = single day event
            'timeZone': 'America/New_York',
        },
        'reminders': {
            'useDefault': False,
            'overrides': [],
        },
    }
    
    try:
        print(f"Creating calendar event: {event_title}")
        print(f"Calendar ID: {calendar_id}")
        print(f"Date: {start_date}")
        created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
        print(f"Event created successfully: {created_event.get('id')}")
        return {
            'success': True,
            'event_id': created_event.get('id'),
            'event_link': created_event.get('htmlLink'),
            'title': event_title,
            'start': start_date
        }
    except Exception as e:
        print(f"Calendar API Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e)
        }


def create_multiple_events(jobs, calendar_id='primary'):
    """
    Create calendar events for multiple jobs.
    
    Args:
        jobs: list of job dicts
        calendar_id: Calendar ID to create events in
    
    Returns:
        dict with results summary
    """
    results = {
        'total': len(jobs),
        'success': 0,
        'failed': 0,
        'events': []
    }
    
    for job in jobs:
        result = create_calendar_event(job, calendar_id)
        if result.get('success'):
            results['success'] += 1
        else:
            results['failed'] += 1
        results['events'].append({
            'job_id': job.get('id'),
            'title': result.get('title', 'Unknown'),
            'success': result.get('success'),
            'error': result.get('error'),
            'event_link': result.get('event_link')
        })
    
    return results
