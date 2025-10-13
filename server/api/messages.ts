import { Router } from "express";
import { z } from "zod";
import { messagesRepo } from "../core/repos/messagesRepo.js";
import { logger } from "../core/tools/logger.js";

const router = Router();

// Validation schemas
const createMessageSchema = z.object({
  body: z.string().min(1, "Message body is required"),
  type: z.string().default("text"),
  meta: z.record(z.any()).default({})
});

// GET /api/messages/:projectId - Get messages for a project
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    logger.projectInfo(projectId, "Getting messages", { limit });

    const messages = await messagesRepo.getByProject(projectId, limit);

    res.json({
      success: true,
      data: messages
    });

  } catch (error) {
    logger.projectError(req.params.projectId, "Failed to get messages", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to get messages"
    });
  }
});

// POST /api/messages/:projectId - Create a new message
router.post("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { body, type, meta } = createMessageSchema.parse(req.body);

    logger.projectInfo(projectId, "Creating new message", { type, bodyLength: body.length });

    const message = await messagesRepo.create({
      projectId,
      body,
      type,
      meta
    });

    logger.projectInfo(projectId, "Message created successfully", { messageId: message.id });

    res.status(201).json({
      success: true,
      data: message
    });

  } catch (error) {
    logger.projectError(req.params.projectId, "Failed to create message", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create message"
    });
  }
});

// GET /api/messages/:projectId/:id - Get specific message
router.get("/:projectId/:id", async (req, res) => {
  try {
    const { projectId, id } = req.params;

    logger.projectInfo(projectId, "Getting message", { messageId: id });

    const message = await messagesRepo.getById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Message not found"
      });
    }

    if (message.projectId !== projectId) {
      return res.status(404).json({
        success: false,
        error: "Message not found"
      });
    }

    res.json({
      success: true,
      data: message
    });

  } catch (error) {
    logger.projectError(req.params.projectId, "Failed to get message", { 
      messageId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to get message"
    });
  }
});

// DELETE /api/messages/:projectId/:id - Delete message
router.delete("/:projectId/:id", async (req, res) => {
  try {
    const { projectId, id } = req.params;

    logger.projectInfo(projectId, "Deleting message", { messageId: id });

    // First check if message exists and belongs to project
    const message = await messagesRepo.getById(id);
    if (!message || message.projectId !== projectId) {
      return res.status(404).json({
        success: false,
        error: "Message not found"
      });
    }

    const deleted = await messagesRepo.delete(id);

    if (deleted) {
      logger.projectInfo(projectId, "Message deleted successfully", { messageId: id });
      res.json({
        success: true,
        message: "Message deleted successfully"
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to delete message"
      });
    }

  } catch (error) {
    logger.projectError(req.params.projectId, "Failed to delete message", { 
      messageId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to delete message"
    });
  }
});

export default router;
