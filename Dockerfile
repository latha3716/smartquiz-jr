FROM python:3.10-alpine
WORKDIR /smartquiz
COPY smartquizjr_backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY smartquizjr_backend ./smartquizjr_backend
EXPOSE 8000
CMD [ "uvicorn", "smartquizjr_backend.app.main:app", "--host", "0.0.0.0", "--port", "8000" ]