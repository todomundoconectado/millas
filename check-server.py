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
log('Connected.\n')

# Check BUILD_ID uploaded
run(client, 'cat /home/u500207944/domains/loja.millas.com.br/nodejs/.next/BUILD_ID')

# Check CSS file on disk
run(client, 'ls /home/u500207944/domains/loja.millas.com.br/nodejs/.next/static/chunks/*.css 2>/dev/null')

# Check server index.html CSS reference
run(client, 'grep -o "/_next/static/chunks/[^\"]*\\.css" /home/u500207944/domains/loja.millas.com.br/nodejs/.next/server/app/index.html 2>/dev/null | head -3')

# Check running node processes
run(client, 'ps aux | grep node | grep loja | grep -v grep | head -5')

# Tmp dir
run(client, 'ls -la /home/u500207944/domains/loja.millas.com.br/nodejs/tmp/')

# Kill node processes to force restart
log('Killing Node processes...')
run(client, 'pkill -f "loja.millas.com.br" && echo "killed" || echo "nothing to kill"')

# Also try killing all node procs for this user
run(client, 'kill $(pgrep -u u500207944 node) 2>/dev/null && echo "killed all node" || echo "no node procs"')

client.close()
log('Done.')
