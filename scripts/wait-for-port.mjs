import net from 'node:net';

const [, , host = '127.0.0.1', portArg = '8090', timeoutArg = '30000'] = process.argv;

const port = Number.parseInt(portArg, 10);
const timeoutMs = Number.parseInt(timeoutArg, 10);

if (!host || Number.isNaN(port) || Number.isNaN(timeoutMs)) {
  console.error('Usage: node scripts/wait-for-port.mjs <host> <port> [timeoutMs]');
  process.exit(1);
}

const startedAt = Date.now();

const checkPort = () =>
  new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1000);

    const finish = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));

    socket.connect(port, host);
  });

const wait = async () => {
  while (Date.now() - startedAt < timeoutMs) {
    const isOpen = await checkPort();

    if (isOpen) {
      console.log(`[wait-for-port] ${host}:${port} is ready`);
      process.exit(0);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.error(`[wait-for-port] Timed out waiting for ${host}:${port}`);
  process.exit(1);
};

wait();
