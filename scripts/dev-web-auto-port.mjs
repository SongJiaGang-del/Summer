import net from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const DEFAULT_PORT = 5173
const MAX_PORT = 65535

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const passthroughArgs = args.filter((arg) => arg !== '--check')

function parseStartPort() {
  const portArgIndex = passthroughArgs.findIndex((arg) => arg === '--port' || arg === '-p')
  if (portArgIndex >= 0 && passthroughArgs[portArgIndex + 1]) {
    const parsed = Number.parseInt(passthroughArgs[portArgIndex + 1], 10)
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= MAX_PORT) {
      passthroughArgs.splice(portArgIndex, 2)
      return parsed
    }
  }

  const envPort = Number.parseInt(process.env.PORT ?? '', 10)
  if (Number.isInteger(envPort) && envPort > 0 && envPort <= MAX_PORT) {
    return envPort
  }

  return DEFAULT_PORT
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', () => {
      resolve(false)
    })

    server.once('listening', () => {
      server.close(() => {
        resolve(true)
      })
    })

    server.listen(port)
  })
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port <= MAX_PORT; port += 1) {
    if (await canListen(port)) return port
  }

  throw new Error(`No available port found from ${startPort} to ${MAX_PORT}.`)
}

function localBin(command) {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command
  return path.join(projectRoot, 'node_modules', '.bin', executable)
}

const startPort = parseStartPort()
const port = await findAvailablePort(startPort)
const launchArgs = ['web', '--port', String(port), ...passthroughArgs]

if (port !== startPort) {
  console.log(`Port ${startPort} is busy, using ${port} instead.`)
} else {
  console.log(`Using port ${port}.`)
}

if (checkOnly) {
  console.log(`uni-launch ${launchArgs.join(' ')}`)
  process.exit(0)
}

const child = spawn(localBin('uni-launch'), launchArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32'
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
