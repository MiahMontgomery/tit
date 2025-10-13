import { Router } from "express";
import { proofsRepo } from "../core/repos/proofsRepo.js";
import { logger } from "../core/tools/logger.js";

const router = Router();

// GET /api/proofs/:projectId - Get proofs for a project
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const type = req.query.type as string;

    logger.projectInfo(projectId, "Getting proofs", { limit, type });

    let proofs;
    if (type) {
      proofs = await proofsRepo.getByType(projectId, type);
    } else {
      proofs = await proofsRepo.getByProject(projectId, limit);
    }

    res.json({
      success: true,
      data: proofs
    });

  } catch (error) {
    logger.projectError(req.params.projectId, "Failed to get proofs", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to get proofs"
    });
  }
});

// GET /api/proofs/:projectId/:id - Get specific proof
router.get("/:projectId/:id", async (req, res) => {
  try {
    const { projectId, id } = req.params;

    logger.projectInfo(projectId, "Getting proof", { proofId: id });

    const proof = await proofsRepo.getById(id);

    if (!proof) {
      return res.status(404).json({
        success: false,
        error: "Proof not found"
      });
    }

    if (proof.projectId !== projectId) {
      return res.status(404).json({
        success: false,
        error: "Proof not found"
      });
    }

    res.json({
      success: true,
      data: proof
    });

  } catch (error) {
    logger.projectError(req.params.projectId, "Failed to get proof", { 
      proofId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to get proof"
    });
  }
});

// GET /api/proofs/:projectId/:id/content - Get proof content
router.get("/:projectId/:id/content", async (req, res) => {
  try {
    const { projectId, id } = req.params;

    logger.projectInfo(projectId, "Getting proof content", { proofId: id });

    const proof = await proofsRepo.getById(id);

    if (!proof) {
      return res.status(404).json({
        success: false,
        error: "Proof not found"
      });
    }

    if (proof.projectId !== projectId) {
      return res.status(404).json({
        success: false,
        error: "Proof not found"
      });
    }

    // For text-based proofs, return content directly
    if (proof.type === 'log' || proof.type === 'code' || proof.type === 'analysis') {
      res.setHeader('Content-Type', 'text/plain');
      res.send(proof.content || '');
    } else {
      // For file-based proofs, return JSON with file info
      res.json({
        success: true,
        data: {
          id: proof.id,
          type: proof.type,
          title: proof.title,
          description: proof.description,
          uri: proof.uri,
          meta: proof.meta,
          createdAt: proof.createdAt
        }
      });
    }

  } catch (error) {
    logger.projectError(req.params.projectId, "Failed to get proof content", { 
      proofId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to get proof content"
    });
  }
});

// DELETE /api/proofs/:projectId/:id - Delete proof
router.delete("/:projectId/:id", async (req, res) => {
  try {
    const { projectId, id } = req.params;

    logger.projectInfo(projectId, "Deleting proof", { proofId: id });

    // First check if proof exists and belongs to project
    const proof = await proofsRepo.getById(id);
    if (!proof || proof.projectId !== projectId) {
      return res.status(404).json({
        success: false,
        error: "Proof not found"
      });
    }

    const deleted = await proofsRepo.delete(id);

    if (deleted) {
      logger.projectInfo(projectId, "Proof deleted successfully", { proofId: id });
      res.json({
        success: true,
        message: "Proof deleted successfully"
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to delete proof"
      });
    }

  } catch (error) {
    logger.projectError(req.params.projectId, "Failed to delete proof", { 
      proofId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to delete proof"
    });
  }
});

export default router;
