# Guia de Deploy para VM/Nuvem

## 🚀 Deploy Rápido na VM

### Passo 1: Preparar a VM
```bash
# SSH na sua VM
ssh usuario@ip-da-vm

# Instalar Node.js e Python
sudo apt-get update
sudo apt-get install -y nodejs npm python3 python3-pip git

# Clonar o repositório
git clone https://github.com/Kodjaoglanian/DAC-UCDB.git
cd DAC-UCDB
```

### Passo 2: Configurar o Arquivo .env
```bash
# Criar arquivo .env
nano .env
```

Adicione o seguinte conteúdo:
```bash
# MongoDB Local na VM (recomendado para VM dedicada)
MONGODB_URI=mongodb://127.0.0.1:27017/dacdb

MONGODB_DB=dacdb
MONGODB_COLLECTION=usuarios
PY_BACKEND_PORT=5000
PORT=3000
```

**OU** se quiser usar MongoDB Atlas (nuvem):
```bash
# MongoDB Atlas (recomendado para deploy distribuído)
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/dacdb?retryWrites=true&w=majority

MONGODB_DB=dacdb
MONGODB_COLLECTION=usuarios
PY_BACKEND_PORT=5000
PORT=3000
```

### Passo 3: Executar o Script Automático
```bash
# Dar permissão de execução
chmod +x run-all.py

# Executar (vai instalar MongoDB, dependências e popular dados)
python3 run-all.py
```

O script vai:
1. ✅ Instalar MongoDB na VM automaticamente
2. ✅ Instalar todas as dependências (Node.js e Python)
3. ✅ Iniciar MongoDB localmente
4. ✅ Popular o banco com 60 registros de exemplo
5. ✅ Iniciar o backend Python (porta 5000)
6. ✅ Iniciar o servidor Node.js (porta 3000)

### Passo 4: Acessar o Dashboard
- **Na VM:** http://localhost:3000
- **De outra máquina:** http://IP-DA-VM:3000

## 🔧 Configuração de Firewall

Se não conseguir acessar de fora da VM, abra as portas:

```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp

# CentOS/RHEL
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --add-port=5000/tcp --permanent
sudo firewall-cmd --reload
```

## 🌐 Opções de Hospedagem

### Opção 1: MongoDB Local na VM (Recomendado para VM dedicada)
✅ Mais rápido
✅ Sem custos adicionais
✅ Configurado automaticamente pelo `run-all.py`
❌ Dados perdidos se VM for reiniciada sem persistência

**Configuração no .env:**
```bash
MONGODB_URI=mongodb://127.0.0.1:27017/dacdb
```

### Opção 2: MongoDB Atlas (Recomendado para produção)
✅ Dados persistentes
✅ Backups automáticos
✅ Escalável
✅ Funciona mesmo se a VM for desligada
❌ Requer conta MongoDB Atlas

**Configuração no .env:**
```bash
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/dacdb?retryWrites=true&w=majority
```

**Como obter MongoDB Atlas:**
1. Acesse https://www.mongodb.com/cloud/atlas
2. Crie uma conta gratuita
3. Crie um cluster (tier gratuito disponível)
4. Em "Database Access", crie um usuário
5. Em "Network Access", adicione o IP da sua VM (ou 0.0.0.0/0 para qualquer IP)
6. Clique em "Connect" e copie a string de conexão
7. Cole no arquivo `.env`

## 🔄 Manter Rodando Permanentemente

Para manter o dashboard rodando mesmo depois de fechar o SSH, use PM2 ou screen:

### Usando PM2 (Recomendado):
```bash
# Instalar PM2
sudo npm install -g pm2

# Criar arquivo de configuração
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'dac-backend',
      script: 'backend.py',
      interpreter: 'python3'
    },
    {
      name: 'dac-frontend',
      script: 'server.js',
      interpreter: 'node'
    }
  ]
};
EOF

# Garantir que MongoDB está rodando
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Popular dados
python3 scripts/seed.py

# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save
pm2 startup
```

### Usando Screen:
```bash
# Instalar screen
sudo apt-get install screen

# Criar sessão
screen -S dac

# Rodar o script
python3 run-all.py

# Desconectar: Ctrl+A depois D
# Reconectar: screen -r dac
```

## 🐛 Troubleshooting

### Dashboard não carrega dados
```bash
# Verificar se MongoDB está rodando
ps aux | grep mongod

# Verificar se dados foram inseridos
mongo dacdb --eval "db.usuarios.count()"

# Popular novamente
python3 scripts/seed.py
```

### Erro "Port already in use"
```bash
# Encontrar e matar processos nas portas
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:5000 | xargs kill -9
```

### MongoDB não inicia
```bash
# Ver logs
cat .mongo-data/mongod.log

# Limpar e reiniciar
rm -rf .mongo-data
python3 run-all.py
```

## 📝 Notas Importantes

1. **Dados Persistentes:** Se usar MongoDB local na VM, os dados ficam em `.mongo-data/`. Faça backup deste diretório!

2. **Variáveis de Ambiente:** Nunca commite o arquivo `.env` com credenciais reais no Git!

3. **Atualizações:** Para atualizar o código:
   ```bash
   git pull
   python3 run-all.py
   ```

4. **Logs:** Logs do MongoDB ficam em `.mongo-data/mongod.log`
