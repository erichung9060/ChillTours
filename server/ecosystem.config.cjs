// server/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "yjs-server",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      env: {
        NODE_ENV: "production",
        PORT: 1234,
        MAX_CONNECTIONS_PER_ROOM: 20,
      },
    },
  ],
};
