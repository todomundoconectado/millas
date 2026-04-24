import paramiko, sys

HOST = '46.202.145.79'; PORT = 65002; USER = 'u500207944'; PASSWORD = 'Millas230@#tt2'

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

def run(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    log(stdout.read().decode('utf-8', errors='replace').strip())

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)

run(client, 'cat /home/u500207944/import-millas/.env.local 2>/dev/null || cat /home/u500207944/import-millas/.env 2>/dev/null || echo "not found"')
run(client, 'ls /home/u500207944/import-millas/')

client.close()
