
module.exports = {
  apps: [{
    name: "genui-server",
    script: "./dist/server.js",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}
