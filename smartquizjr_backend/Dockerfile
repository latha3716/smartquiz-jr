FROM python:3.10-alpine

WORKDIR /smartquiz

# Copy requirements file (it is in the same folder as this Dockerfile)
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend code
COPY . .

EXPOSE 8000

# app/main.py → app.main:app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
