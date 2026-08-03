FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

COPY backend ./backend
COPY ai-development ./ai-development

WORKDIR /app/backend

EXPOSE 8000

CMD ["python", "run_server.py"]
