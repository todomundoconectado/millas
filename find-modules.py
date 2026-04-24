import paramiko, sys, time

HOST = '46.202.145.79'; PORT = 65002; USER = 'u500207944'; PASSWORD = 'Millas230@#tt2'

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

def run(client, cmd, timeout=20):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    log(f'$ {cmd}\n{out}\n')
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)

run(client, 'ls /home/u500207944/domains/loja.millas.com.br/nodejs/')
run(client, 'ls /home/u500207944/domains/loja.millas.com.br/nodejs/node_modules/ 2>/dev/null | head -20 || echo "no node_modules"')
run(client, 'find /home/u500207944 -name "mysql2" -type d -maxdepth 8 2>/dev/null | head -5')

client.close()
