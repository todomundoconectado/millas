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
    log(f'$ {cmd}')
    if out: log(out)
    log('')
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)

# Check app-build-manifest.json on server
run(client, "grep -o '0[a-z0-9~.-]*\\.css' /home/u500207944/domains/loja.millas.com.br/nodejs/.next/app-build-manifest.json 2>/dev/null | sort -u | head -10")
run(client, "grep -o '0[a-z0-9~.-]*\\.css' /home/u500207944/domains/loja.millas.com.br/nodejs/.next/build-manifest.json 2>/dev/null | sort -u | head -10")

# Check all JSON manifests for CSS
run(client, "ls /home/u500207944/domains/loja.millas.com.br/nodejs/.next/*.json")

# Check if there is a fallback-build-manifest.json
run(client, "grep -o '0[a-z0-9~.-]*\\.css' /home/u500207944/domains/loja.millas.com.br/nodejs/.next/fallback-build-manifest.json 2>/dev/null | sort -u | head -10")

client.close()
