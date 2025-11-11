#!/usr/bin/env python3
"""
Script Python para configurar e rodar o dashboard DAC de uma vez.
Uso: python run-all.py
"""
import subprocess
import sys
import time
import os

def run_command(cmd, description, check=True):
    """Executa um comando e verifica se foi bem-sucedido."""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=check, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} concluído!")
            return True
        else:
            print(f"❌ Falha em {description}: {result.stderr}")
            return False
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro em {description}: {e}")
        return False

def main():
    print("🚀 Iniciando configuração do Dashboard DAC...")

    # 1. Instalar dependências Node.js
    if not run_command("npm install", "Instalando dependências Node.js"):
        sys.exit(1)

    # 2. Instalar pymongo (Python)
    if not run_command("pip install pymongo", "Instalando pymongo"):
        sys.exit(1)

    # 3. Popular dados no MongoDB (executando diretamente em Python)
    if not run_command("python scripts/seed.py", "Populando dados no MongoDB", check=False):
        sys.exit(1)

    # 4. Iniciar backend Python em background
    print("🐍 Iniciando backend Python...")
    backend_process = subprocess.Popen([sys.executable, "backend.py"])
    time.sleep(3)  # Aguardar iniciar

    # 5. Iniciar servidor Node.js
    print("🌐 Iniciando servidor Node.js...")
    print("✅ Tudo pronto! Acesse http://localhost:3000")
    print("Para parar: pressione Ctrl+C")

    try:
        # Executar npm start em foreground
        subprocess.run("npm start", shell=True, check=True)
    except KeyboardInterrupt:
        print("\n🛑 Parando serviços...")
    finally:
        # Matar processo do backend
        if backend_process.poll() is None:
            backend_process.terminate()
            backend_process.wait()
        print("👋 Serviços encerrados!")

if __name__ == "__main__":
    main()