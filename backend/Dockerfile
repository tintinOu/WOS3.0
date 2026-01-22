FROM python:3.10-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Service must listen to $PORT environment variable.
# This default value facilitates local development.
ENV PORT 8080
EXPOSE 8080

# Run the web service on container startup. Use shell form to expand $PORT.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
