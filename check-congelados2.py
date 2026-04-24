"""Diagnose Congelados via SSH running mysql on server."""
import paramiko
import sys

HOST = '46.202.145.79'
PORT = 65002
USER = 'u500207944'
PASSWORD = 'Millas230@#tt2'

DB_HOST = '127.0.0.1'
DB_USER = 'u500207944_todomundoconec'
DB_PASS = 'Snake230@#TMC2026'
DB_NAME = 'u500207944_super_millas'

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

def run(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: log(out)
    if err and 'Warning' not in err: log('ERR: ' + err)
    log('')
    return out

def q(client, label, sql):
    log(f'=== {label} ===')
    cmd = f"mysql -h {DB_HOST} -u '{DB_USER}' -p'{DB_PASS}' {DB_NAME} -e \"{sql}\" 2>/dev/null"
    return run(client, cmd)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)

# Confirm DB connection
q(client, 'CONEXÃO', 'SELECT 1 as ok;')

# Congelados category
q(client, 'CATEGORIA CONGELADOS', "SELECT id, nome, slug, ativo FROM categories WHERE slug = 'congelados';")

# Products in congelados
q(client, 'PRODUTOS EM CONGELADOS', "SELECT COUNT(*) as total FROM products p JOIN categories c ON p.categoria_id = c.id WHERE c.slug = 'congelados' AND p.ativo = 1;")

# WooCommerce categories that were deactivated with congelado keywords
q(client, 'CATEGORIAS WOO COM PALAVRAS DE CONGELADOS',
  "SELECT id, nome, slug, ativo FROM categories WHERE ativo = 0 AND (nome LIKE '%congelad%' OR nome LIKE '%sorvete%' OR nome LIKE '%gelado%' OR nome LIKE '%frozen%' OR nome LIKE '%pizza%');")

# All inactive categories (to see what was deactivated)
q(client, 'TOTAL CATEGORIAS ATIVAS VS INATIVAS',
  "SELECT ativo, COUNT(*) as qtd FROM categories GROUP BY ativo;")

# Products with freezer keywords regardless of category
q(client, 'PRODUTOS COM NOME DE CONGELADOS (qualquer categoria)',
  "SELECT p.nome, c.nome as categoria FROM products p LEFT JOIN categories c ON p.categoria_id = c.id WHERE p.ativo = 1 AND (p.nome LIKE '%congelad%' OR p.nome LIKE '%sorvete%' OR p.nome LIKE '%gelado%' OR p.nome LIKE '%pizza%') LIMIT 20;")

# All 10 commercial categories with product count
q(client, 'TODAS AS CATEGORIAS COM CONTAGEM',
  "SELECT c.nome, c.slug, COUNT(p.id) as produtos FROM categories c LEFT JOIN products p ON p.categoria_id = c.id AND p.ativo = 1 WHERE c.ativo = 1 GROUP BY c.id ORDER BY c.ordem;")

client.close()
