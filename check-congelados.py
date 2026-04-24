"""Diagnose why Congelados category has no products."""
import paramiko
import sys

HOST = '46.202.145.79'
PORT = 65002
USER = 'u500207944'
PASSWORD = 'Millas230@#tt2'

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

def run(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: log(out)
    if err: log('ERR: ' + err)
    log('')
    return out

# MySQL credentials from env
DB_HOST = '127.0.0.1'
DB_PORT = '3306'
DB_USER = 'u500207944_millas'
DB_PASS = 'Millas230@#tt2'
DB_NAME = 'u500207944_millas'

def mysql(client, query):
    cmd = f'mysql -h {DB_HOST} -P {DB_PORT} -u {DB_USER} -p{DB_PASS} {DB_NAME} -e "{query}" 2>/dev/null'
    return run(client, cmd)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=65002, username=USER, password=PASSWORD, timeout=30)

log('=== CATEGORIA CONGELADOS ===\n')

# Check if congelados category exists
mysql(client, "SELECT id, nome, slug, ativo FROM categories WHERE slug = 'congelados';")

# Count products in congelados
mysql(client, "SELECT COUNT(*) as total_produtos FROM products p JOIN categories c ON p.categoria_id = c.id WHERE c.slug = 'congelados' AND p.ativo = 1;")

# Check what WooCommerce categories were mapped to congelados
log('=== CATEGORIAS WOO QUE DEVERIAM IR PARA CONGELADOS ===\n')
mysql(client, "SELECT nome FROM categories WHERE ativo = 0 AND (nome LIKE '%congelad%' OR nome LIKE '%sorvete%' OR nome LIKE '%gelado%' OR nome LIKE '%frozen%');")

# How many total inactive categories have congelado-related names
log('=== PRODUTOS COM PALAVRAS-CHAVE DE CONGELADOS (sem filtro de categoria) ===\n')
mysql(client, "SELECT COUNT(*) as total FROM products WHERE ativo = 1 AND (nome LIKE '%congelad%' OR nome LIKE '%sorvete%' OR nome LIKE '%gelado%' OR nome LIKE '%pizza%');")

# Show sample
mysql(client, "SELECT p.id, p.nome, c.nome as categoria FROM products p LEFT JOIN categories c ON p.categoria_id = c.id WHERE p.ativo = 1 AND (p.nome LIKE '%congelad%' OR p.nome LIKE '%sorvete%' OR p.nome LIKE '%pizza%') LIMIT 20;")

# Check what categories these products are actually in
mysql(client, "SELECT c.nome, c.slug, COUNT(*) as qtd FROM products p LEFT JOIN categories c ON p.categoria_id = c.id WHERE p.ativo = 1 AND (p.nome LIKE '%congelad%' OR p.nome LIKE '%sorvete%' OR p.nome LIKE '%pizza%') GROUP BY c.id ORDER BY qtd DESC LIMIT 15;")

client.close()
