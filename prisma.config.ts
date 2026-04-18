import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

loadEnv({ path: ['.env.local', '.env'], quiet: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(process.env.DIRECT_URL ? { datasource: { url: process.env.DIRECT_URL } } : {}),
})
