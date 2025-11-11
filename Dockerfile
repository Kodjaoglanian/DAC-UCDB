# Dockerfile único para rodar backend Python e frontend Node.js no mesmo container

FROM node:18-bullseye

WORKDIR /app

# Instalar Python e pip
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 python3-pip \
	&& rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependências Python
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copiar e instalar dependências Node
COPY package*.json ./
RUN npm ci --omit=dev || npm install --only=production

# Copiar código fonte
COPY . .

# Tornar script de inicialização executável
RUN chmod +x ./docker-start.sh || true

# Expor portas do frontend e backend
EXPOSE 3000 5000

# Variáveis padrão (podem ser sobrescritas via docker run / compose)
ENV PY_BACKEND_PORT=5000

# Comando de inicialização: sobe backend (background) e frontend (foreground)
CMD ["/bin/bash", "-lc", "./docker-start.sh"]
