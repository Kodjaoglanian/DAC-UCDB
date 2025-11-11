"""Servidor HTTP simples em Python para expor a API /api/pessoas."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
import json
import os
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient

DEFAULT_URI = os.environ.get('MONGODB_URI', 'mongodb+srv://username:password@cluster.mongodb.net/')
DEFAULT_DB = os.environ.get('MONGODB_DB', 'dacdb')
DEFAULT_COLLECTION = os.environ.get('MONGODB_COLLECTION', 'usuarios')
PORT = int(os.environ.get('PY_BACKEND_PORT', 5000))


def get_client():
    uri = DEFAULT_URI
    client = MongoClient(uri, tls=True, tlsAllowInvalidCertificates=True, tlsAllowInvalidHostnames=True)
    return client


def serialize_document(doc):
    base = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            base[key] = str(value)
        elif isinstance(value, datetime):
            base[key] = value.isoformat()
        else:
            base[key] = value

    nome = base.get('nome') or base.get('name') or 'Nome não informado'
    cidade = base.get('cidade') or base.get('city') or 'Cidade não informada'
    provedora = (
        base.get('provedora')
        or base.get('provedor')
        or base.get('provider')
        or base.get('internet')
        or 'Não informado'
    )
    plano = base.get('plano') or base.get('planoInternet') or base.get('planoContratado') or '—'
    contato = base.get('contato') or base.get('email') or base.get('telefone') or base.get('phone') or '—'
    atualizado_em = (
        base.get('atualizadoEm')
        or base.get('updatedAt')
        or base.get('criadoEm')
        or base.get('createdAt')
        or base.get('dataAtualizacao')
    )

    return {
        'id': base.get('_id'),
        'nome': nome,
        'cidade': cidade,
        'provedora': provedora,
        'plano': plano,
        'contato': contato,
        'atualizadoEm': atualizado_em,
    }


class DashboardHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200, content_type='application/json; charset=UTF-8'):
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/pessoas':
            self.handle_people()
        else:
            self._set_headers(404)
            self.wfile.write(b'{"error":"Not found"}')

    def handle_people(self):
        try:
            client = get_client()
            collection = client[DEFAULT_DB][DEFAULT_COLLECTION]
            documents = list(collection.find({}))
            client.close()
            payload = {'data': [serialize_document(doc) for doc in documents]}
            self._set_headers(200)
            self.wfile.write(json.dumps(payload).encode('utf-8'))
        except Exception as exc:
            self._set_headers(500)
            error_payload = {
                'error': 'Erro ao consultar MongoDB',
                'details': str(exc),
            }
            self.wfile.write(json.dumps(error_payload).encode('utf-8'))


def run_server():
    with HTTPServer(('0.0.0.0', PORT), DashboardHandler) as httpd:
        print(f'Backend Python ouvindo em http://localhost:{PORT}')
        httpd.serve_forever()


if __name__ == '__main__':
    run_server()
