const { MongoClient } = require('mongodb');

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/dacdb';
const DEFAULT_DB = process.env.MONGODB_DB || 'dacdb';
const DEFAULT_COLLECTION = process.env.MONGODB_COLLECTION || 'usuarios';

let client;
let collectionPromise;

async function ensureClient() {
  if (!client) {
    const uri = process.env.MONGODB_URI || DEFAULT_URI;
    if (!uri) {
      throw new Error('Defina a variável de ambiente MONGODB_URI com a string de conexão do MongoDB.');
    }
    console.log('MongoDB: criando cliente, tentando conectar...');
    client = new MongoClient(uri, {
      retryWrites: false
    });
  }

  if (!client.topology) {
    try {
      await client.connect();
      console.log('MongoDB: conexão estabelecida com sucesso.');
    } catch (err) {
      console.error('MongoDB: falha ao conectar:', err && err.message ? err.message : err);
      throw err;
    }
  }

  return client;
}

async function getCollection() {
  if (!collectionPromise) {
    collectionPromise = ensureClient()
      .then(cli => cli.db(DEFAULT_DB).collection(DEFAULT_COLLECTION))
      .catch(err => {
        collectionPromise = null;
        throw err;
      });
  }
  return collectionPromise;
}

async function fetchPeople() {
  const collection = await getCollection();
  const cursor = collection.find({});
  const documents = await cursor.toArray();
  return documents.map(serializeDocument);
}

function serializeDocument(doc) {
  const base = {};
  Object.entries(doc).forEach(([key, value]) => {
    if (key === '_id' && value) {
      base[key] = value.toString();
      return;
    }
    if (value instanceof Date) {
      base[key] = value.toISOString();
      return;
    }
    base[key] = value;
  });

  const nome = base.nome || base.name || null;
  const cidade = base.cidade || base.city || null;
  const provedora = base.provedora || base.provedor || base.provider || base.provedoraInternet || null;
  const plano = base.plano || base.planoInternet || base.planoContratado || null;
  const contato = base.contato || base.email || base.telefone || base.phone || null;
  const atualizadoEm = base.atualizadoEm || base.updatedAt || base.criadoEm || base.createdAt || null;

  return {
    id: base._id || null,
    nome: nome,
    cidade: cidade,
    provedora: provedora,
    plano: plano,
    contato: contato,
    atualizadoEm: atualizadoEm,
    original: base
  };
}

async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
    collectionPromise = null;
  }
}

module.exports = {
  fetchPeople,
  closeConnection
};
