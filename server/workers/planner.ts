import { z } from "zod";
import { storage } from "../storage";
import { randomUUID } from "crypto";
import { httpTap } from "../lib/httpTap";

const hierarchySchema = z.object({
  features: z.array(z.object({
    featureId: z.string(),
    milestones: z.array(z.object({
      title: z.string(),
      goals: z.array(z.object({
        title: z.string(),
      })),
    })),
  })),
});

export async function ensureHierarchy({ projectId }: { projectId: string }): Promise<{ created: boolean }> {
  try {
    // Check if project already has milestones or goals
    const existingMilestones = await storage.getMilestonesByProject(projectId);
    const existingGoals = await storage.getGoalsByProject(projectId);
    
    if (existingMilestones.length > 0 || existingGoals.length > 0) {
      console.log(`Project ${projectId} already has hierarchy data`);
      return { created: false };
    }

    // Load project and features
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const features = await storage.getFeaturesByProject(projectId);
    if (features.length === 0) {
      console.warn(`Project ${projectId} has no features, cannot generate hierarchy`);
      return { created: false };
    }

    console.log(`Generating hierarchy for project ${projectId} with ${features.length} features`);

  // Generate hierarchy using OpenRouter for substantial goals
  const hierarchy = await generateHierarchyWithLLM(project, features);

  // Validate with zod
  const validatedHierarchy = hierarchySchema.parse(hierarchy);

  // Insert milestones and goals
  for (const featureData of validatedHierarchy.features) {
    for (let i = 0; i < featureData.milestones.length; i++) {
      const milestoneData = featureData.milestones[i];
      const milestoneId = randomUUID();
      
      await storage.createMilestone({
        id: milestoneId,
        projectId,
        featureId: featureData.featureId,
        title: milestoneData.title,
        state: "PLANNED",
        orderIndex: i,
      });

      for (let j = 0; j < milestoneData.goals.length; j++) {
        const goalData = milestoneData.goals[j];
        const goalId = randomUUID();
        
        await storage.createGoal({
          id: goalId,
          projectId,
          milestoneId,
          title: goalData.title,
          state: "PLANNED",
          orderIndex: j,
        });
      }
    }
  }

  console.log(`Successfully created hierarchy for project ${projectId}`);
  return { created: true };
  
  } catch (error) {
    console.error(`Error generating hierarchy for project ${projectId}:`, error);
    throw error;
  }
}

async function generateHierarchyWithLLM(project: any, features: any[]) {
  try {
    const prompt = `You are an expert project manager and technical architect. Generate a detailed project hierarchy for the following project:

Project: ${project.name}
Description: ${project.description}

Features to break down:
${features.map(f => `- ${f.name}: ${f.description || 'No description'}`).join('\n')}

For each feature, create 2-3 meaningful milestones, and for each milestone, create 3-5 specific, actionable goals. Each goal should be:
- Specific and measurable
- Technically detailed
- Realistic and achievable
- Connected to the project's overall purpose

Respond with valid JSON in this exact format:
{
  "features": [
    {
      "featureId": "feature-id-here",
      "milestones": [
        {
          "title": "Specific milestone title",
          "goals": [
            { "title": "Specific, actionable goal 1" },
            { "title": "Specific, actionable goal 2" },
            { "title": "Specific, actionable goal 3" }
          ]
        }
      ]
    }
  ]
}`;

    const response = await httpTap.post('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Titan Project Management'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert project manager and technical architect. Generate detailed, actionable project hierarchies with specific goals and milestones.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    const hierarchy = JSON.parse(content);
    
    // Map feature IDs to actual feature IDs
    const hierarchyWithIds = {
      features: hierarchy.features.map((featureData: any, index: number) => ({
        ...featureData,
        featureId: features[index]?.id || randomUUID()
      }))
    };
    
    return hierarchyWithIds;
    
  } catch (error) {
    console.error('Error generating hierarchy with LLM:', error);
    
    // Fallback to simple hierarchy if LLM fails
    return {
      features: features.map(feature => ({
        featureId: feature.id,
        milestones: [
          {
            title: `Implement ${feature.name} Core Functionality`,
            goals: [
              { title: `Design and implement ${feature.name} data models` },
              { title: `Create ${feature.name} API endpoints` },
              { title: `Build ${feature.name} user interface components` },
              { title: `Add ${feature.name} validation and error handling` },
              { title: `Write comprehensive tests for ${feature.name}` }
            ],
          },
          {
            title: `Optimize and Deploy ${feature.name}`,
            goals: [
              { title: `Performance optimization for ${feature.name}` },
              { title: `Security hardening for ${feature.name}` },
              { title: `Deploy ${feature.name} to production` },
              { title: `Monitor and maintain ${feature.name}` }
            ],
          },
        ],
      })),
    };
  }
}
