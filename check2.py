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
    log(f'$ {cmd}')
    if out: log(out)
    if err: log(f'ERR: {err}')
    log('')
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)

# Check CSS hash in server index.html using single quotes
run(client, "grep -o '/_next/static/chunks/[^\"]*\\.css' /home/u500207944/domains/loja.millas.com.br/nodejs/.next/server/app/index.html 2>/dev/null | head -3")

# Check all CSS references in server HTML files
run(client, "grep -rh -o '/_next/static/chunks/[^\"]*\\.css' /home/u500207944/domains/loja.millas.com.br/nodejs/.next/server/app/ 2>/dev/null | sort -u | head -10")

# Grep JS chunks for CSS hash references
run(client, "grep -rh -o '0sm1im2uradru' /home/u500207944/domains/loja.millas.com.br/nodejs/.next/static/chunks/ 2>/dev/null | head -3")
run(client, "grep -rh -o '0rik~0\\.\\-ta1xo' /home/u500207944/domains/loja.millas.com.br/nodejs/.next/static/chunks/ 2>/dev/null | head -3")

# Check what webpack bundles reference for CSS
run(client, "ls /home/u500207944/domains/loja.millas.com.br/nodejs/.next/static/chunks/ | grep webpack")

client.close()
