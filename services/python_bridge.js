import { spawn } from 'node:child_process';

// Python 能力先作为桥接入口保留；后续图像/视频处理模块复用这里。
export function runPythonBridge(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['python/ai_bridge.py'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code) return reject(new Error(stderr || `Python exited with ${code}`));
      resolve(JSON.parse(stdout || '{}'));
    });

    child.stdin.end(JSON.stringify(payload));
  });
}
