"""Upload and run a tsx script on the server (with proper dir creation)."""
import paramiko
import sys
import os
import posixpath

HOST = '46.202.145.79'
PORT = 65002
USER = 'u500207944'
PASSWORD = 'Millas230@#tt2'
REMOTE_BASE = '/home/u500207944/domains/loja.millas.com.br/nodejs'
NPX = '/opt/alt/alt-nodejs22/root/usr/bin/npx'

SCRIPT = sys.argv[1] if len(sys.argv) > 1 else 'src/scripts/check-congelados.ts'
LOCAL_SCRIPT = os.path.join(r'd:\Sync\TMC\Antigravity\super-millas', SCRIPT.replace('/', os.sep))

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

def sftp_makedirs(sftp, path):
    parts = path.split('/')
    current = ''
    for part in parts:
        if not part:
            current = '/'
            continue
        current = current + '/' + part if current != '/' else '/' + part
        try:
            sftp.stat(current)
        except IOError:
            try:
                sftp.mkdir(current)
            except:
                pass

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
log(f'Connected. Uploading {SCRIPT}...')

sftp = client.open_sftp()
remote_script = REMOTE_BASE + '/' + SCRIPT.replace(os.sep, '/')
remote_dir = posixpath.dirname(remote_script)
sftp_makedirs(sftp, remote_dir)
sftp.put(LOCAL_SCRIPT, remote_script)
sftp.close()
log('Uploaded. Running...\n')

cmd = f'cd {REMOTE_BASE} && {NPX} tsx {SCRIPT} 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
output = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
log(output)
if err:
    log('STDERR: ' + err)

client.close()
