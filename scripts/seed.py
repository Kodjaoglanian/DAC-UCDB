import os
import random
from datetime import datetime, timedelta
from pymongo import MongoClient

# === Configurações ===
URI = os.getenv("MONGODB_URI", "mongodb+srv://username:password@cluster.mongodb.net/")
DB_NAME = os.getenv("MONGODB_DB", "dacdb")
COLLECTION_NAME = os.getenv("MONGODB_COLLECTION", "usuarios")

# === Dados base ===
nomes = [
    'João Silva', 'Maria Souza', 'Ana Costa', 'Pedro Lima', 'Lucas Oliveira', 'Juliana Santos',
    'Rafael Pereira', 'Fernanda Gomes', 'André Almeida', 'Carla Ribeiro', 'Bruno Fernandes',
    'Patrícia Carvalho', 'Rodrigo Azevedo', 'Gabriela Rocha', 'Thiago Martins', 'Camila Dias',
    'Felipe Nogueira', 'Larissa Mendes', 'Daniel Barbosa', 'Amanda Castro', 'Gustavo Melo',
    'Beatriz Pinto', 'Leonardo Cardoso', 'Carolina Faria', 'Matheus Correia', 'Vanessa Teixeira',
    'Diego Monteiro', 'Letícia Duarte', 'Vinícius Brito', 'Isabela Freitas', 'Eduardo Rezende',
    'Renata Tavares', 'Marcelo Paiva', 'Tatiane Moura', 'Caio Moreira', 'Priscila Lopes',
    'Alexandre Vieira', 'Débora Lima', 'Henrique Fernandes', 'Sabrina Souza', 'Ricardo Santos',
    'Bianca Oliveira', 'Maurício Correia', 'Natália Barbosa', 'Sérgio Costa', 'Adriana Almeida',
    'Rogério Martins', 'Érica Ribeiro', 'Fábio Nunes', 'Daniela Castro', 'Fernando Duarte',
    'Luciana Azevedo', 'Cristiano Tavares', 'Patrícia Nogueira', 'Vitor Rocha', 'Kelly Moura',
    'Roberto Mendes', 'Juliane Brito', 'Marcos Cardoso', 'Paula Reis', 'Rafaela Gomes'
]

cidades = [
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Fortaleza',
    'Curitiba', 'Recife', 'Porto Alegre', 'Manaus', 'Belém', 'Goiânia',
    'Florianópolis', 'Vitória', 'Natal', 'Campo Grande', 'João Pessoa',
    'Maceió', 'Teresina', 'São Luís', 'Aracaju', 'Cuiabá', 'Londrina',
    'Ribeirão Preto', 'Uberlândia', 'Santos', 'Sorocaba', 'Campinas',
    'Juiz de Fora', 'Pelotas', 'Caxias do Sul', 'Maringá', 'Foz do Iguaçu',
    'Blumenau', 'Joinville', 'Itajaí', 'Niterói', 'Volta Redonda', 'Taubaté',
    'Bauru', 'Caruaru', 'Mossoró', 'Macapá', 'Boa Vista', 'Palmas',
    'Criciúma', 'Petrolina', 'Anápolis', 'Chapecó', 'Vila Velha', 'Franca',
    'Barueri', 'Jundiaí', 'Piracicaba', 'Lages', 'Patos de Minas', 'Parnaíba',
    'Cabo Frio', 'Itabuna', 'Sete Lagoas', 'Dourados'
]

provedores = [
    {"nome": "Claro", "peso": 5},
    {"nome": "Oi", "peso": 3},
    {"nome": "Tim", "peso": 4},
    {"nome": "Vivo", "peso": 10},
    {"nome": "Não usa internet", "peso": 19}
]

planos_por_provedor = {
    "Claro": ["Fibra 200 Mb", "Fibra 300 Mb", "Fibra 500 Mb", "Fibra 600 Mb", "Fibra 1 Gb"],
    "Oi": ["Fibra 200 Mb", "Fibra 400 Mb", "Fibra 500 Mb", "Fibra 1 Gb"],
    "Tim": ["5G Home 400 Mb", "5G Home 500 Mb", "4G Home 200 Mb", "4G Home 100 Mb"],
    "Vivo": ["Fibra 200 Mb", "Fibra 300 Mb", "Fibra 600 Mb", "Fibra 700 Mb", "Fibra 1 Gb"],
    "Não usa internet": ["—"]
}

email_domains = ["connect.com.br", "mail.com", "provedor.net", "redeurbana.com"]

# === Funções auxiliares ===
def random_choice(arr):
    return random.choice(arr)

def weighted_choice(options):
    total = sum(opt["peso"] for opt in options)
    r = random.uniform(0, total)
    for opt in options:
        r -= opt["peso"]
        if r <= 0:
            return opt["nome"]
    return options[-1]["nome"]

def slugify(text):
    import unicodedata, re
    text = unicodedata.normalize("NFD", text)
    text = re.sub(r"[\u0300-\u036f]", "", text)
    text = re.sub(r"[^a-zA-Z\s]", "", text).strip().lower()
    return text.replace(" ", ".")

def build_email(nome):
    slug = slugify(nome) or f"usuario{random.randint(1000, 9999)}"
    return f"{slug}@{random_choice(email_domains)}"

def build_phone():
    ddd = random.randint(11, 99)
    prefixo = random.randint(90000, 99999)
    sufixo = random.randint(1000, 9999)
    return f"({ddd}) {prefixo}-{sufixo}"

def build_plano(provedor):
    return random_choice(planos_por_provedor.get(provedor, ["—"]))

def build_contato(provedor, nome):
    return build_phone() if provedor == "Não usa internet" else build_email(nome)

def random_date_in_past(months=12):
    return datetime.now() - timedelta(days=random.randint(0, months * 30))

# === Execução principal ===
def main():
    print("Iniciando seed de dados...")

    try:
        client = MongoClient(
            URI,
            tls=True,
            tlsAllowInvalidCertificates=True,
            tlsAllowInvalidHostnames=True,
            retryWrites=True,
            w="majority"
        )
        db = client[DB_NAME]
        col = db[COLLECTION_NAME]

        print("Conectando ao MongoDB...")
        col.delete_many({})
        print(f"Colecao {COLLECTION_NAME} limpa!")

        usuarios = []
        for _ in range(60):
            nome = random_choice(nomes)
            provedor = weighted_choice(provedores)
            usuario = {
                "nome": nome,
                "idade": random.randint(18, 65),
                "internet": provedor,
                "provedora": provedor,
                "plano": build_plano(provedor),
                "contato": build_contato(provedor, nome),
                "cidade": random_choice(cidades),
                "localizacao": random_choice(cidades),
                "atualizadoEm": random_date_in_past(),
                "createdAt": datetime.now(),
                "updatedAt": datetime.now(),
            }
            usuarios.append(usuario)

        result = col.insert_many(usuarios)
        print(f"{len(result.inserted_ids)} registros inseridos com sucesso!")

        # Estatísticas simples
        counts = {}
        for u in usuarios:
            counts[u["internet"]] = counts.get(u["internet"], 0) + 1
        print("\nDistribuicao de provedores:")
        for prov, count in sorted(counts.items(), key=lambda x: -x[1]):
            print(f"  {prov}: {count} pessoas")

        print("\nSeed concluido!")

    except Exception as e:
        print(f"Erro durante seed: {e}")
    finally:
        client.close()


if __name__ == "__main__":
    main()
