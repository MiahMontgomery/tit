import { Router } from "express";
import { z } from "zod";
import { personaCreator } from "../services/personaCreator.js";

/**
 * Express router for persona-related API endpoints.
 *
 * This router exposes CRUD-like endpoints for creating a new persona and
 * listing existing personas. It delegates core business logic to the
 * `personaCreator` service which encapsulates database interactions and
 * project provisioning for each persona. Validation is performed using
 * Zod to ensure incoming payloads contain the expected shape. Errors
 * encountered during execution are logged and surfaced to clients in a
 * consistent JSON structure.
 */
const router = Router();

// Validation schema for creating a persona.  The `name` and `role` fields
// are required strings.  A description can optionally be supplied to
// provide additional context about the persona.  Traits are arbitrary
// key/value pairs describing persona attributes (e.g. personality
// traits, preferences) and are optional.
const createPersonaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  description: z.string().optional().default(""),
  traits: z.record(z.any()).optional()
});

// POST /api/personas - Create a new persona and corresponding project
router.post("/", async (req, res) => {
  try {
    // Validate request body
    const { name, role, description, traits } = createPersonaSchema.parse(req.body);

    // Delegate creation to the personaCreator service
    const personaProject = await personaCreator.createPersonaProject(name, role, description, traits);

    res.status(201).json({
      success: true,
      data: personaProject
    });
  } catch (error) {
    // If validation fails, return a 400 with details
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }
    // For all other errors, return a generic 500
    console.error("Failed to create persona", error);
    res.status(500).json({
      success: false,
      error: "Failed to create persona"
    });
  }
});

// GET /api/personas - List all personas
router.get("/", async (_req, res) => {
  try {
    const personas = await personaCreator.listPersonas();
    res.json({
      success: true,
      data: personas
    });
  } catch (error) {
    console.error("Failed to list personas", error);
    res.status(500).json({
      success: false,
      error: "Failed to list personas"
    });
  }
});

// GET /api/personas/:id - Retrieve a persona by its identifier
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const persona = await personaCreator.getPersona(id);
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: "Persona not found"
      });
    }
    res.json({
      success: true,
      data: persona
    });
  } catch (error) {
    console.error("Failed to get persona", error);
    res.status(500).json({
      success: false,
      error: "Failed to get persona"
    });
  }
});

export default router;
