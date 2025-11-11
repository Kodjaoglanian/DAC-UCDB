# Dockerfile multi-stage para backend Python e frontend Node.js

FROM python:3.9-slim AS python-base

WORKDIR /app

# Instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código Python
COPY backend.py .
COPY scripts/ ./scripts/

# Expor porta do backend Python
EXPOSE 5000

# Comando para rodar backend
CMD ["python", "backend.py"]
