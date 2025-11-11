#!/bin/bash
# Script para popular dados no MongoDB via Docker

echo "Aguardando backend iniciar..."
sleep 5

echo "Populando dados no MongoDB..."
docker exec -it dac-backend python scripts/seed.py

echo "Seed concluído!"
