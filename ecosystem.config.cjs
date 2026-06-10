module.exports = {
  apps: [{
    name: 'secboard-backend',
    script: process.env.SECBOARD_BACKEND_CMD || 'bun',
    args: process.env.SECBOARD_BACKEND_ARGS || 'run src/elysia/index.ts',
    instances: process.env.PM2_INSTANCES || 1,
    exec_mode: process.env.PM2_EXEC_MODE || 'fork',
    env: {
      NODE_ENV: 'production',
      LANSTART_BACKEND_HOST: '0.0.0.0',
      LANSTART_BACKEND_PORT: 3131,
      LANSTART_CAST_HOST: '0.0.0.0',
      LANSTART_CAST_PORT: 3132,
      LANSTART_DB_PATH: './data/lanstart.sqlite',
      LANSTART_ALLOWED_ORIGINS: process.env.LANSTART_ALLOWED_ORIGINS || 'https://yourdomain.com',
      LANSTART_API_TOKEN: process.env.LANSTART_API_TOKEN || '',
    },
    max_memory_restart: '512M',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    merge_logs: true,
    time: true,
    kill_timeout: 5000,
    listen_timeout: 10000,
  }]
}
