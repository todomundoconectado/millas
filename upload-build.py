"""
Upload local .next build to Hostinger server to fix CSS 404 bug.
"""
import paramiko
import os
import sys

# SSH credentials
HOST = '46.202.145.79'
PORT = 65002
USER = 'u500207944'
PASSWORD = 'Millas230@#tt2'

REMOTE_BASE = '/home/u500207944/domains/loja.millas.com.br/nodejs'
LOCAL_NEXT = r'd:/Sync/TMC/Antigravity/super-millas/.next'
LOCAL_PUBLIC = r'd:/Sync/TMC/Antigravity/super-millas/public'

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

def sftp_put_dir(sftp, local_dir, remote_dir):
    """Recursively upload local_dir to remote_dir."""
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)

    count = 0
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + '/' + item
        if os.path.isdir(local_path):
            count += sftp_put_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            count += 1
            if count % 50 == 0:
                log(f'  Uploaded {count} files...')
    return count

def main():
    log('Connecting to Hostinger...')
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    log('Connected.')

    sftp = client.open_sftp()

    # Upload .next/static
    log('\nUploading .next/static ...')
    local_static = os.path.join(LOCAL_NEXT, 'static')
    remote_static = REMOTE_BASE + '/.next/static'
    count = sftp_put_dir(sftp, local_static, remote_static)
    log(f'Done: {count} files uploaded to static/')

    # Upload .next/server
    log('\nUploading .next/server ...')
    local_server = os.path.join(LOCAL_NEXT, 'server')
    remote_server = REMOTE_BASE + '/.next/server'
    count = sftp_put_dir(sftp, local_server, remote_server)
    log(f'Done: {count} files uploaded to server/')

    # Upload ALL root-level files in .next/ (manifests, BUILD_ID, etc.)
    log('\nUploading root manifest files...')
    for fname in os.listdir(LOCAL_NEXT):
        local_f = os.path.join(LOCAL_NEXT, fname)
        if os.path.isfile(local_f):
            remote_f = REMOTE_BASE + '/.next/' + fname
            sftp.put(local_f, remote_f)
            log(f'  Uploaded {fname}')

    # Upload public/ (static assets: logo, images, svgs)
    log('\nUploading public/ ...')
    local_public = LOCAL_PUBLIC
    remote_public = REMOTE_BASE + '/public'
    count = sftp_put_dir(sftp, local_public, remote_public)
    log(f'Done: {count} files uploaded to public/')

    sftp.close()

    # Restart Passenger
    log('\nRestarting Passenger...')
    stdin, stdout, stderr = client.exec_command(
        'touch /home/u500207944/domains/loja.millas.com.br/nodejs/tmp/restart.txt 2>&1 || echo "touch failed"'
    )
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: log('stdout: ' + out)
    if err: log('stderr: ' + err)

    # Kill old processes to force restart
    log('Killing old Node processes...')
    stdin, stdout, stderr = client.exec_command(
        'pkill -f "loja.millas.com.br" 2>&1; echo "done"'
    )
    log(stdout.read().decode('utf-8', errors='replace').strip())

    client.close()
    log('\nDone! Site should reload with correct CSS.')

if __name__ == '__main__':
    main()
