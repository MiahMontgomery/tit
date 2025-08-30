import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertMessageSchema, insertFeatureSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get single project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Create project
  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      await storage.createLog(project.id, "Project Created", `Project "${project.name}" was created`);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const success = await storage.deleteProject(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Get project features
  app.get("/api/projects/:id/features", async (req, res) => {
    try {
      const features = await storage.getFeaturesByProject(req.params.id);
      res.json(features);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  // Create feature
  app.post("/api/projects/:id/features", async (req, res) => {
    try {
      const validatedData = insertFeatureSchema.parse({
        ...req.body,
        projectId: req.params.id
      });
      const feature = await storage.createFeature(validatedData);
      await storage.createLog(req.params.id, "Feature Created", `Feature "${feature.name}" was created`);
      res.status(201).json(feature);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid feature data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create feature" });
    }
  });

  // Get project messages
  app.get("/api/projects/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesByProject(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Create message
  app.post("/api/projects/:id/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        projectId: req.params.id
      });
      const message = await storage.createMessage(validatedData);
      await storage.createLog(req.params.id, "Message Sent", `${message.sender} sent a message`);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Get project logs
  app.get("/api/projects/:id/logs", async (req, res) => {
    try {
      const logs = await storage.getLogsByProject(req.params.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Get project deliverables
  app.get("/api/projects/:id/deliverables", async (req, res) => {
    try {
      const deliverables = await storage.getDeliverablesByProject(req.params.id);
      res.json(deliverables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deliverables" });
    }
  });

  // Get sales data
  app.get("/api/projects/:id/sales", async (req, res) => {
    try {
      const salesData = await storage.getSalesData(req.params.id);
      if (!salesData) {
        return res.status(404).json({ message: "Sales data not found" });
      }
      res.json(salesData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
