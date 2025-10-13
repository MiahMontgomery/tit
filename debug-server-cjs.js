// Debug server using CommonJS
const express = require('express');

console.log("Starting debug server (CommonJS)...");

const app = express();
const port = 3000;

app.get("/health", (req, res) => {
  console.log("Health check requested");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(port, () => {
  console.log(`Debug server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
