#!/usr/bin/env bash
set -euo pipefail

# Opcional: popular dados ao iniciar o container
if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[setup] Rodando seed de dados..."
  python3 scripts/seed.py || echo "[setup] Seed falhou (não crítico). Continuei."
fi

# Iniciar backend Python em background
echo "[start] Iniciando backend Python na porta ${PY_BACKEND_PORT:-5000}..."
python3 backend.py &
BACKEND_PID=$!

# Iniciar frontend Node.js em foreground
echo "[start] Iniciando servidor Node.js na porta 3000..."
node server.js

# Ao sair do Node, encerrar backend
echo "[stop] Encerrando backend (pid=$BACKEND_PID)"
kill $BACKEND_PID 2>/dev/null || true
wait $BACKEND_PID 2>/dev/null || true
