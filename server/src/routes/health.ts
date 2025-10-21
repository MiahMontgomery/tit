import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    version: process.env.APP_VERSION || 'dev',
    timestamp: new Date().toISOString()
  });
});

export default router;
