"""Verify all server-side files are consistent after upload."""
import paramiko
import sys

HOST = '46.202.145.79'
PORT = 65002
USER = 'u500207944'
PASSWORD = 'Millas230@#tt2'
REMOTE = '/home/u500207944/domains/loja.millas.com.br/nodejs'

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

def run(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    log(f'$ {cmd}')
    if out: log(out)
    log('')
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)

# Verify all server HTMLs use the correct CSS hash
run(client, f"grep -rh -o '0sm1im2uradru' {REMOTE}/.next/server/ 2>/dev/null | wc -l")

# Check for any remaining old hashes
run(client, f"grep -rh -o '0rik~0\\.-ta1xo\\|0cdx2\\.uyl~r3y\\|07dynkcn-re_z' {REMOTE}/.next/server/ 2>/dev/null | sort | uniq -c")

# Count server HTML files
run(client, f"find {REMOTE}/.next/server/app -name '*.html' 2>/dev/null | wc -l")

# CSS files on disk
run(client, f"ls {REMOTE}/.next/static/chunks/*.css 2>/dev/null")

# Remove old CSS files that don't match our build
run(client, f"ls {REMOTE}/.next/static/chunks/*.css | grep -v '0sm1im2uradru' | xargs rm -f 2>/dev/null && echo 'old CSS cleaned'")

client.close()
log('Check complete.')
