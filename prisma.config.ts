import { config as loadEnv } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

loadEnv({ path: ['.env.local', '.env'], quiet: true })

type Env = {
  DATABASE_URL: string
  DIRECT_URL: string
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env<Env>('DIRECT_URL'),
  },
})
