"""Upload and run a JS script on the server with full node path."""
import paramiko
import sys
import os
import time

HOST = '46.202.145.79'
PORT = 65002
USER = 'u500207944'
PASSWORD = 'Millas230@#tt2'
REMOTE_BASE = '/home/u500207944/domains/loja.millas.com.br/nodejs'
NODE = '/opt/alt/alt-nodejs22/root/usr/bin/node'

SCRIPT = sys.argv[1] if len(sys.argv) > 1 else 'check-congelados.js'
LOCAL_SCRIPT = os.path.join(r'd:\Sync\TMC\Antigravity\super-millas', SCRIPT)

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
log(f'Connected. Uploading {SCRIPT}...')

sftp = client.open_sftp()
sftp.put(LOCAL_SCRIPT, f'{REMOTE_BASE}/{SCRIPT}')
sftp.close()
log('Uploaded. Running...\n')

# First find where mysql2 is actually installed
stdin, stdout, stderr = client.exec_command(
    f'find {REMOTE_BASE} -name "promise.js" -path "*/mysql2/*" 2>/dev/null | head -3'
)
mysql2_path = stdout.read().decode().strip()
log(f'mysql2 found at: {mysql2_path}')

cmd = f'cd {REMOTE_BASE} && {NODE} {SCRIPT} 2>&1'
transport = client.get_transport()
chan = transport.open_session()
chan.exec_command(cmd)
chan.settimeout(60)

output = b''
while True:
    if chan.recv_ready():
        chunk = chan.recv(4096)
        if chunk:
            output += chunk
            log(chunk.decode('utf-8', errors='replace'))
        else:
            break
    elif chan.exit_status_ready():
        break
    else:
        time.sleep(0.1)

while chan.recv_ready():
    chunk = chan.recv(4096)
    if chunk:
        log(chunk.decode('utf-8', errors='replace'))

exit_status = chan.recv_exit_status()
log(f'\nExit code: {exit_status}')
client.close()
