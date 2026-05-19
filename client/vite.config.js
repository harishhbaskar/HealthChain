import { defineConfig, loadEnv } from 'vite'
import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const httpsEnabled = env.VITE_HTTPS === 'true'
  const httpsKeyPath = env.VITE_HTTPS_KEY_PATH
  const httpsCertPath = env.VITE_HTTPS_CERT_PATH

  let serverConfig = { port: 5173 }
  if (httpsEnabled) {
    if (!httpsKeyPath || !httpsCertPath || !fs.existsSync(httpsKeyPath) || !fs.existsSync(httpsCertPath)) {
      throw new Error('VITE_HTTPS=true but VITE_HTTPS_KEY_PATH/VITE_HTTPS_CERT_PATH are missing or invalid.')
    }
    serverConfig = {
      ...serverConfig,
      https: {
        key: fs.readFileSync(httpsKeyPath),
        cert: fs.readFileSync(httpsCertPath),
      },
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: serverConfig,
  }
})
