import { execFileSync } from 'node:child_process';

const ports = process.argv.slice(2).map((port) => Number.parseInt(port, 10)).filter(Number.isFinite);

if (ports.length === 0) {
  console.error('[stop-dev-ports] No ports provided.');
  process.exit(1);
}

if (process.platform === 'win32') {
  const portList = ports.join(',');
  const command = `
$ports = @(${portList})
$connections = Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue
$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
if (-not $processIds) {
  Write-Host "[stop-dev-ports] No listeners found on ports: $($ports -join ', ')"
  exit 0
}
foreach ($processId in $processIds) {
  try {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId"
    Write-Host "[stop-dev-ports] Stopping PID $processId $($process.CommandLine)"
    Stop-Process -Id $processId -Force
  } catch {
    Write-Warning "[stop-dev-ports] Failed to stop PID $($processId): $($_.Exception.Message)"
  }
}
`;

  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    stdio: 'inherit',
  });
} else {
  for (const port of ports) {
    try {
      const pids = execFileSync('sh', ['-c', `lsof -ti tcp:${port} 2>/dev/null || true`], {
        encoding: 'utf8',
      }).split(/\s+/).filter(Boolean);

      for (const pid of new Set(pids)) {
        console.log(`[stop-dev-ports] Stopping PID ${pid} on port ${port}`);
        process.kill(Number(pid), 'SIGTERM');
      }
    } catch (error) {
      console.warn(`[stop-dev-ports] Failed to stop listener on port ${port}: ${error.message}`);
    }
  }
}
