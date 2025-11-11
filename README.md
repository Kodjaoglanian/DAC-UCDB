# DAC Dashboard

# Dashboard DAC

Dashboard em Node.js puro para visualização de provedores de internet com dados do MongoDB.

## Configuração

Antes de executar, configure a conexão com MongoDB:

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto ou defina as variáveis de ambiente:

```bash
# URI de conexão do MongoDB Atlas
MONGODB_URI=mongodb+srv://seu_usuario:sua_senha@seu_cluster.mongodb.net/

# Opcional: nome do banco e coleção
MONGODB_DB=dacdb
MONGODB_COLLECTION=usuarios
```

**⚠️ Importante:** Nunca commite credenciais reais no repositório. Use variáveis de ambiente.

## Como rodar

### Arquivos principais
- `server.js` - servidor HTTP estático + endpoint `GET /api/pessoas` que retorna os documentos do MongoDB.
- `src/database.js` - integração com MongoDB (usa `MONGODB_URI` se definida).
- `public/` - frontend estático (HTML/CSS/JS).
**⚠️ Importante:** Nunca commite credenciais reais no repositório. Use variáveis de ambiente.

## Como rodar

### Opção 1: Docker (recomendado para produção)

1. **Configure as variáveis de ambiente:**

Crie um arquivo `.env` na raiz do projeto:

```bash
MONGODB_URI=mongodb+srv://seu_usuario:sua_senha@seu_cluster.mongodb.net/
MONGODB_DB=dacdb
MONGODB_COLLECTION=usuarios
```

2. **Inicie os containers:**

```bash
docker-compose up -d
```

3. **Popular dados no MongoDB (opcional):**

Opção A: definir na subida dos containers (via .env):
```bash
# no arquivo .env
SEED_ON_START=true
```
Depois rode novamente `docker-compose up -d`.

Opção B: executar manualmente após subir os containers:
```bash
docker exec -it dac-app python3 scripts/seed.py
```

4. **Acesse o dashboard:**

`http://localhost:3000`

5. **Parar os containers:**

```bash
docker-compose down
```

### Opção 2: Script Python local (desenvolvimento)

Execute tudo de uma vez com o script Python:

```bash
python run-all.py
```

Este script:
- Instala dependências Node.js e Python
- Popula a coleção MongoDB com dados de exemplo
- Inicia o backend Python (porta 5000)
- Inicia o servidor Node.js (porta 3000)

Acesse `http://localhost:3000` no navegador.

### Opção 3: Manual
Se preferir executar passo a passo:

1. Instalar dependências:

```bash
npm install
pip install pymongo
```

2. Popular dados:

```bash
npm run seed
```

3. Iniciar backend Python:

```bash
python backend.py
```

4. Em outro terminal, iniciar servidor Node.js:

```bash
npm start
```

Acesse `http://localhost:3000`.

## Estrutura do Projeto

```
DAC/
├── backend.py              # Backend Python (API REST)
├── server.js              # Servidor Node.js (frontend)
├── public/                # Arquivos estáticos
│   ├── index.html        # Interface do dashboard
│   ├── styles.css        # Estilos
│   └── script.js         # Lógica frontend
├── src/
│   └── database.js       # Conexão MongoDB (Node.js - não usado)
├── scripts/
│   └── seed.py           # Script para popular dados
├── Dockerfile            # Container único (Node + Python)
├── docker-compose.yml    # Orquestração de containers
├── requirements.txt      # Dependências Python
├── package.json          # Dependências Node.js
├── .env.example          # Template de variáveis de ambiente
└── README.md             # Este arquivo
```

## Arquitetura

- **Frontend**: Servidor Node.js servindo arquivos estáticos (HTML/CSS/JS)
- **Backend**: API Python com pymongo para conexão MongoDB Atlas
- **Banco de Dados**: MongoDB Atlas (cloud)
- **Containerização**: Docker + Docker Compose

## Tecnologias

- Node.js (servidor estático)
- Python 3.9+ (API REST)
- MongoDB Atlas (banco de dados)
- Docker & Docker Compose
- HTML/CSS/JavaScript (frontend)

## Erro TLS / SSL ao conectar ao MongoDB Atlas
Se, ao tentar carregar `/api/pessoas`, você vir um erro com `tls` / `SSL alert number 80` ou `MongoServerSelectionError`, experimente os passos abaixo:

1. Verifique a versão do Node (requer TLS 1.2+). Rode:

```powershell
node -v
```

Recomendo Node LTS atual (por exemplo 18.x ou 20.x). Se a versão for antiga (< 12/14), atualize para LTS.

2. Teste a conectividade ao cluster (DNS e porta). No PowerShell:

```powershell
nslookup seu_cluster.mongodb.net
# e testar acesso TCP (substitua host por um SRV resolvido)
Test-NetConnection -ComputerName seu_cluster-shard-00-00.mongodb.net -Port 27017
```

3. Verifique se o IP da sua máquina está permitido na lista de IPs do Atlas (Network Access). Para testes temporários, autorize `0.0.0.0/0` (não recomendado para produção).

4. Tente conectar com o `mongodb.py` (Python) que acompanha o projeto — se funcionar, o problema é específico do Node/OpenSSL. Se falhar também, é problema de rede/whitelist/credenciais.

5. Como último recurso temporário (apenas para depuração), você pode forçar o driver a aceitar certificados inválidos, mas isso reduz segurança.

## Backend Python (recomendado)

Para evitar problemas de TLS com o driver Node, um backend simples em Python (`backend.py`) expõe `GET /api/pessoas` na porta `5000`.

### Pré-requisitos
- Python 3.9+
- Biblioteca `pymongo` instalada (`pip install pymongo`).

### Executando

```powershell
# opcional: definir variáveis
$env:MONGODB_URI = 'mongodb+srv://seu_usuario:sua_senha@seu_cluster.mongodb.net/'
$env:MONGODB_DB = 'dacdb'
$env:MONGODB_COLLECTION = 'usuarios'

python backend.py
```

A API ficará disponível em `http://localhost:5000/api/pessoas`.

### Frontend
O arquivo `public/script.js` já aponta por padrão para `http://localhost:5000/api/pessoas`. Para levantar a interface:

```powershell
npm start
# acesse http://localhost:3000
```

### Ajustando o endpoint manualmente
Se quiser usar outro backend, defina `window.DASHBOARD_API` antes de carregar `script.js` no HTML, ou altere `API_ENDPOINT` manualmente.

### Seed de dados (Python ou Node)
Você pode continuar usando o script Python original para gerar dados. Alternativamente, o Node dispõe de `npm run seed` (ainda sujeito ao mesmo problema de TLS na máquina local).

## Logging e depuração
- O servidor agora responde 204 para `/favicon.ico` para evitar logs ENOENT.
- Mensagens de erro de conexão com o MongoDB são registradas no console com `console.error(...)` para ajudar a depurar.

## Próximos passos que eu posso executar
- Alterar `src/database.js` para oferecer opção de `tlsAllowInvalidCertificates` ligada via variável de ambiente para depuração segura.
- Implementar paginação no endpoint `/api/pessoas` para grandes coleções.
- Adicionar autenticação/roles se quiser limitar quem acessa os dados.

Se quiser, eu posso tentar reiniciar o servidor aqui e observar o output ao acessar `/api/pessoas` — quer que eu faça isso agora? Se sim, confirme que posso tentar conectar ao cluster usando o URI que está no arquivo (ou defina `MONGODB_URI` via variável de ambiente no ambiente em que eu vou executar).