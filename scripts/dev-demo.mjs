/**
 * Levanta el backend simulado y el frontend juntos:  npm run dev:demo
 * Ctrl+C detiene ambos.
 */
import { spawn } from "node:child_process";

const processes = [
  ["mock", "npm run dev:mock"],
  ["web", "npm run dev:frontend"],
].map(([name, command]) => {
  const child = spawn(command, { stdio: ["ignore", "pipe", "pipe"], shell: true });
  const prefix = (chunk) =>
    chunk
      .toString()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => `[${name}] ${line}`)
      .join("\n") + "\n";
  child.stdout.on("data", (chunk) => process.stdout.write(prefix(chunk)));
  child.stderr.on("data", (chunk) => process.stderr.write(prefix(chunk)));
  child.on("exit", (code) => {
    console.log(`[${name}] terminó (código ${code}). Deteniendo todo…`);
    shutdown(code ?? 0);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (child.exitCode !== null) continue;
    // En Windows hay que matar el árbol completo (npm → node).
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    else child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
