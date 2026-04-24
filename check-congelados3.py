"""Query DB directly from local machine using external IP."""
import sys
try:
    import pymysql
except ImportError:
    import subprocess
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'pymysql'], capture_output=True)
    import pymysql

DB_HOST = '193.203.175.174'
DB_PORT = 3306
DB_USER = 'u500207944_todomundoconec'
DB_PASS = 'Snake230@#TMC2026'
DB_NAME = 'u500207944_super_millas'

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

conn = pymysql.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, database=DB_NAME, connect_timeout=15)
cur = conn.cursor()

def q(label, sql):
    log(f'=== {label} ===')
    cur.execute(sql)
    rows = cur.fetchall()
    desc = [d[0] for d in cur.description]
    log('\t'.join(desc))
    for r in rows:
        log('\t'.join(str(x) for x in r))
    log('')

q('TODAS AS CATEGORIAS COM CONTAGEM',
  """SELECT c.nome, c.slug, c.ativo, COUNT(p.id) as produtos
     FROM categories c LEFT JOIN products p ON p.categoria_id = c.id AND p.ativo = 1
     WHERE c.ativo = 1 GROUP BY c.id ORDER BY c.ordem""")

q('CATEGORIA CONGELADOS',
  "SELECT id, nome, slug, ativo FROM categories WHERE slug = 'congelados'")

q('CATEGORIAS WOO COM PALAVRAS DE CONGELADOS (desativadas)',
  "SELECT id, nome, slug FROM categories WHERE ativo = 0 AND (nome LIKE '%congelad%' OR nome LIKE '%sorvete%' OR nome LIKE '%gelado%' OR nome LIKE '%frozen%' OR nome LIKE '%pizza%')")

q('PRODUTOS COM NOMES DE CONGELADOS (em qualquer categoria)',
  """SELECT p.nome, c.nome as categoria
     FROM products p LEFT JOIN categories c ON p.categoria_id = c.id
     WHERE p.ativo = 1 AND (p.nome LIKE '%congelad%' OR p.nome LIKE '%sorvete%' OR p.nome LIKE '%pizza%' OR p.nome LIKE '%gelado%')
     LIMIT 25""")

conn.close()
log('Concluído.')
