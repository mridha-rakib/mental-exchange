import net from 'node:net';

const ports = process.argv.slice(2).map((port) => Number.parseInt(port, 10)).filter(Number.isFinite);

if (ports.length === 0) {
  console.error('[check-dev-ports] No ports provided.');
  process.exit(1);
}

const isPortOpen = (port) => new Promise((resolve) => {
  const socket = net.createConnection({ host: '127.0.0.1', port });

  socket.once('connect', () => {
    socket.destroy();
    resolve(true);
  });

  socket.once('error', () => {
    resolve(false);
  });

  socket.setTimeout(1000, () => {
    socket.destroy();
    resolve(false);
  });
});

const busyPorts = [];

for (const port of ports) {
  if (await isPortOpen(port)) {
    busyPorts.push(port);
  }
}

if (busyPorts.length > 0) {
  console.error(`[check-dev-ports] Required dev port(s) already in use: ${busyPorts.join(', ')}`);
  console.error('[check-dev-ports] Stop the existing dev servers or run: npm run dev:stop');
  process.exit(1);
}

console.log(`[check-dev-ports] Required dev ports are free: ${ports.join(', ')}`);
