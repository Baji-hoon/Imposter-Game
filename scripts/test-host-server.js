const net = require('net');

const server = net.createServer((socket) => {
  console.error(`[HostServer] Connection from ${socket.remoteAddress}:${socket.remotePort}`);
  let buffer = '';
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    console.error(`[HostServer] Raw chunk received: ${chunk.toString('utf8').trim()}`);
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      console.error(`[HostServer] Inbound line: ${line.trim()}`);
      try {
        const msg = JSON.parse(line.trim());
        if (msg.t === 'probe') {
          const resp = JSON.stringify({
            v: 1,
            t: 'probe_ok',
            app: 'imposter',
            room: 'WIFI',
            host: 'TestHost',
            clients: 1
          }) + '\n';
          console.error(`[HostServer] Responding with probe_ok to ${socket.remoteAddress}`);
          socket.write(resp, () => {
            console.error(`[HostServer] probe_ok written, closing socket`);
            socket.end();
          });
        }
      } catch (err) {
        console.error('[HostServer] JSON error:', err.message);
      }
    }
  });
  socket.on('error', (err) => {
    console.error(`[HostServer] Socket error: ${err.message}`);
  });
  socket.on('close', () => {
    console.error(`[HostServer] Socket closed for ${socket.remoteAddress}`);
  });
});

server.listen(47777, '0.0.0.0', () => {
  console.error('[HostServer] Listening on 0.0.0.0:47777');
});
