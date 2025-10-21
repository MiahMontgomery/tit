import { Router } from "express";

const metrics: Record<string, number> = {
  requests: 0,
  errors: 0,
  jobsProcessed: 0,
  projectsCreated: 0,
  uptime: 0
};

let startTime = Date.now();

export const incrementMetric = (key: keyof typeof metrics) => {
  if (key in metrics) {
    metrics[key]++;
  }
};

const router = Router();

router.get("/", (req, res) => {
  metrics.uptime = Math.floor((Date.now() - startTime) / 1000);
  res.json(metrics);
});

export default router;
