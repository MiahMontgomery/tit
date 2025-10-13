import fetch from "node-fetch";

if (!process.env.OPENROUTER_API_KEY) {
  console.warn("⚠️  OPENROUTER_API_KEY not set - LLM features will be limited");
}

if (!process.env.OPENROUTER_BASE_URL) {
  console.warn("⚠️  OPENROUTER_BASE_URL not set - using default");
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LLMClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || "mock-key";
    this.baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  }

  async generateText(
    prompt: string,
    model: string = "openai/gpt-4o-mini",
    maxTokens: number = 1000
  ): Promise<LLMResponse> {
    if (!process.env.OPENROUTER_API_KEY) {
      // Return mock response for testing
      return {
        content: `Mock response for: ${prompt}`,
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Titan Project Management"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      return {
        content: data.choices[0].message.content,
        usage: data.usage
      };
    } catch (error) {
      console.error("LLM API error:", error);
      throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeProject(prompt: string): Promise<{
    description: string;
    features: string[];
    milestones: string[];
    goals: string[];
  }> {
    const analysisPrompt = `Analyze this project request and provide a structured breakdown:

Project Request: "${prompt}"

Please respond with a JSON object containing:
{
  "description": "A clear, detailed description of what this project should accomplish",
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"],
  "goals": ["Goal 1", "Goal 2", "Goal 3", "Goal 4", "Goal 5"]
}

Make the features high-level capabilities, milestones are major phases, and goals are specific actionable items.`;

    const response = await this.generateText(analysisPrompt, "openai/gpt-4o-mini", 2000);
    
    try {
      const parsed = JSON.parse(response.content);
      return {
        description: parsed.description || "No description provided",
        features: parsed.features || [],
        milestones: parsed.milestones || [],
        goals: parsed.goals || []
      };
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      // Fallback to basic analysis
      return {
        description: prompt,
        features: ["Core functionality", "User interface", "Data management"],
        milestones: ["Planning", "Development", "Testing"],
        goals: ["Define requirements", "Create prototype", "Implement features", "Test system", "Deploy"]
      };
    }
  }

  async generateTaskDescription(taskType: string, context: string): Promise<string> {
    const prompt = `Generate a clear, actionable description for a ${taskType} task in the context of: ${context}

Provide a concise description that explains what needs to be done.`;

    const response = await this.generateText(prompt, "openai/gpt-4o-mini", 200);
    return response.content;
  }

  async llmPlanJson(prompt: string): Promise<any> {
    if (!process.env.OPENROUTER_API_KEY) {
      // Return mock plan for testing
      return {
        features: [
          {
            title: "Mock Feature",
            description: "A mock feature for testing",
            weight: 1,
            milestones: [
              {
                title: "Mock Milestone",
                description: "A mock milestone for testing",
                weight: 1,
                acceptance: {},
                goals: [
                  {
                    title: "Mock Goal 1",
                    description: "First mock goal",
                    acceptance: {}
                  },
                  {
                    title: "Mock Goal 2", 
                    description: "Second mock goal",
                    acceptance: {}
                  }
                ]
              }
            ]
          }
        ]
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Titan Project Management"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [{
            role: "user",
            content: `Given this project prompt:
"${prompt}"

Return STRICT JSON with this shape:
{
  "features": [
    {
      "title": "string",
      "description": "string",
      "weight": 1,
      "milestones": [
        {
          "title": "string",
          "description": "string",
          "weight": 1,
          "acceptance": {},
          "goals": [
            {
              "title": "string",
              "description": "string",
              "acceptance": {}
            }
          ]
        }
      ]
    }
  ]
}`
          }],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data?.choices?.[0]?.message?.content ?? "{}";
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse LLM JSON response:", parseError);
        // Fallback to basic structure
        return {
          features: [
            {
              title: "Core Functionality",
              description: "Main features for the project",
              weight: 1,
              milestones: [
                {
                  title: "Planning Phase",
                  description: "Initial planning and setup",
                  weight: 1,
                  acceptance: {},
                  goals: [
                    {
                      title: "Define Requirements",
                      description: "Clearly define what needs to be built",
                      acceptance: {}
                    },
                    {
                      title: "Create Architecture",
                      description: "Design the system architecture",
                      acceptance: {}
                    }
                  ]
                },
                {
                  title: "Development Phase",
                  description: "Build the core features",
                  weight: 1,
                  acceptance: {},
                  goals: [
                    {
                      title: "Implement Core Features",
                      description: "Build the main functionality",
                      acceptance: {}
                    },
                    {
                      title: "Add User Interface",
                      description: "Create the user interface",
                      acceptance: {}
                    }
                  ]
                }
              ]
            }
          ]
        };
      }
    } catch (error) {
      console.error("LLM plan generation error:", error);
      throw new Error(`Failed to generate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const llmClient = new LLMClient();
