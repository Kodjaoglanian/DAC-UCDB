#!/usr/bin/env python3
"""
Script Python para configurar e rodar o dashboard DAC de uma vez.
Uso: python run-all.py
"""
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

def run_command(cmd, description, check=True, capture=True):
    """Executa um comando e verifica se foi bem-sucedido."""
    print(f"🔄 {description}...")
    try:
        kwargs = {
            "shell": True,
            "check": check,
            "text": True,
        }
        if capture:
            kwargs["capture_output"] = True
        result = subprocess.run(cmd, **kwargs)
        if result.returncode == 0:
            print(f"✅ {description} concluído!")
            return True
        else:
            message = result.stderr if capture else "Verifique o log acima para detalhes."
            print(f"❌ Falha em {description}: {message}")
            return False
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro em {description}: {e}")
        return False

def load_env_file():
    """Carrega variáveis de ambiente do arquivo .env"""
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        print("🔧 Carregando variáveis de ambiente do .env...")
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print("✅ Variáveis de ambiente carregadas!")
    else:
        print("⚠️  Arquivo .env não encontrado. Usando valores padrão.")


def is_port_open(host: str, port: int, timeout: float = 1.5) -> bool:
    """Verifica se uma porta está aberta."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(timeout)
        return sock.connect_ex((host, port)) == 0


def ensure_mongod_binary() -> bool:
    """Confere se o binário do mongod está disponível."""
    return shutil.which("mongod") is not None


def install_mongodb() -> bool:
    """Tenta instalar o MongoDB via apt caso não esteja presente."""
    if ensure_mongod_binary():
        return True

    print("🛠 MongoDB não encontrado. Tentando instalar localmente via APT...")
    commands = [
        ("Atualizando repositórios APT", "sudo apt-get update -y"),
        ("Instalando pacote mongodb", "sudo apt-get install -y mongodb")
    ]

    for description, command in commands:
        if not run_command(command, description, capture=False):
            print("❌ Não foi possível instalar o MongoDB automaticamente. Instale manualmente e execute novamente.")
            return False

    if ensure_mongod_binary():
        print("✅ MongoDB instalado com sucesso!")
        return True

    print("❌ MongoDB ainda não está disponível após tentativa de instalação.")
    return False


def start_local_mongodb():
    """Garante que um MongoDB local esteja rodando. Retorna (processo, log_handle)."""
    host = os.environ.get("MONGODB_HOST", "127.0.0.1")
    uri = os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017/")

    port = 27017
    if "mongodb://" in uri:
        try:
            host_port = uri.split("//", 1)[1].split("/", 1)[0]
            if ":" in host_port:
                host, port_str = host_port.split(":", 1)
                port = int(port_str)
            else:
                host = host_port
        except (IndexError, ValueError):
            port = 27017

    if is_port_open(host, port):
        print("✅ MongoDB local já está em execução!")
        return None, None

    if not ensure_mongod_binary():
        if not install_mongodb():
            sys.exit(1)

    data_dir = Path(__file__).parent / ".mongo-data"
    data_dir.mkdir(parents=True, exist_ok=True)
    log_file_path = data_dir / "mongod.log"
    log_file = open(log_file_path, "a", encoding="utf-8")
    log_file.write("\n=== Inicialização do MongoDB local ===\n")
    log_file.flush()

    print("🚀 Iniciando MongoDB local...")
    mongod_cmd = [
        "mongod",
        "--dbpath", str(data_dir),
        "--bind_ip", host,
        "--port", str(port)
    ]

    try:
        process = subprocess.Popen(
            mongod_cmd,
            stdout=log_file,
            stderr=subprocess.STDOUT
        )
    except FileNotFoundError:
        log_file.close()
        print("❌ Não foi possível encontrar o executável mongod. Instale o MongoDB e tente novamente.")
        sys.exit(1)

    for _ in range(20):
        if process.poll() is not None:
            break
        if is_port_open(host, port):
            print("✅ MongoDB local iniciado!")
            return process, log_file
        time.sleep(1)

    print("❌ Falha ao iniciar o MongoDB local. Consulte o log em", log_file_path)
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
    log_file.close()
    sys.exit(1)


def stop_local_mongodb(process, log_handle):
    """Finaliza o MongoDB iniciado por este script."""
    if process is None:
        return
    print("🛑 Encerrando MongoDB local...")
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
    if log_handle:
        log_handle.write("=== MongoDB finalizado pelo run-all.py ===\n")
        log_handle.close()

def main():
    print("🚀 Iniciando configuração do Dashboard DAC...")

    # 0. Carregar variáveis de ambiente
    load_env_file()

    # 1. Garantir MongoDB local
    mongo_process, mongo_log_handle = start_local_mongodb()

    # 2. Instalar dependências Node.js
    if not run_command("npm install", "Instalando dependências Node.js"):
        stop_local_mongodb(mongo_process, mongo_log_handle)
        sys.exit(1)

    # 3. Instalar pymongo (Python)
    if not run_command("pip install pymongo --break-system-packages", "Instalando pymongo"):
        stop_local_mongodb(mongo_process, mongo_log_handle)
        sys.exit(1)

    # 4. Popular dados no MongoDB (executando diretamente em Python)
    if not run_command("python scripts/seed.py", "Populando dados no MongoDB", check=False):
        stop_local_mongodb(mongo_process, mongo_log_handle)
        sys.exit(1)

    # 5. Iniciar backend Python em background
    print("🐍 Iniciando backend Python...")
    backend_process = subprocess.Popen([sys.executable, "backend.py"])
    time.sleep(3)  # Aguardar iniciar

    # 6. Iniciar servidor Node.js
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
        stop_local_mongodb(mongo_process, mongo_log_handle)
        print("👋 Serviços encerrados!")

if __name__ == "__main__":
    main()