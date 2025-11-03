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

  async generateReiterationDraft(params: {
    title: string;
    context?: any;
    previousVersion?: any;
    userEdits?: string;
  }): Promise<{
    narrative: string;
    prominentFeatures: any[];
    modes: any[];
    milestones: any[];
    risks: any[];
    dependencies: any[];
    instrumentation: any[];
    acceptanceCriteria: any[];
  }> {
    const { title, context, previousVersion, userEdits } = params;
    
    const contextText = context?.text || (typeof context === 'string' ? context : JSON.stringify(context));
    const hasContext = !!contextText;
    
    let prompt = `You are an expert project architect and technical advisor. Your task is to create a comprehensive, intelligent project plan that reasons about the project requirements and provides actionable recommendations.

PROJECT REQUEST:
Title: ${title}
${contextText ? `Description/Context:\n${contextText}` : ''}

${previousVersion ? `PREVIOUS DRAFT (v${previousVersion.version}):\n${JSON.stringify(previousVersion, null, 2)}\n\nThe user reviewed this and wants changes.` : ''}
${userEdits ? `USER FEEDBACK/REQUESTS:\n"${userEdits}"\n\nIncorporate this feedback into a new, improved draft.` : ''}

${!hasContext && !previousVersion ? `NOTE: The user provided minimal information. Be intelligent: analyze what type of project this likely is based on the title, make reasonable assumptions, and ASK for more context where needed. Provide multiple approaches (smartest, most cost-effective, fastest, etc.) when applicable.` : ''}

YOUR TASK:
1. **Intelligently analyze** what this project actually needs based on the title and any provided context
2. **Reason about constraints**: If it's a VR game, mention hardware needs and suggest cloud alternatives. If it's a mobile app, discuss platform choices. If it's a physical product, discuss manufacturing.
3. **Provide multiple approaches** when relevant:
   - Smartest way (most scalable, modern tech)
   - Best way (optimal balance)
   - Cheapest way (budget-friendly)
   - Fastest way (rapid deployment)
4. **Ask clarifying questions** if critical information is missing
5. **Recommend technology stack** and architecture based on project type
6. **Identify risks** specific to this project type
7. **Suggest dependencies** (APIs, services, tools, hardware)
8. **Design milestones** that make sense for this specific project

RETURN STRICT JSON with this exact structure:
{
  "narrative": "A DETAILED 8-15 paragraph narrative that: (a) analyzes what this project truly needs, (b) discusses different implementation approaches (smartest/best/cheapest) when relevant, (c) identifies constraints or requirements (hardware, platforms, etc.), (d) recommends technology stack and architecture, (e) explains why these choices are optimal, (f) addresses any user feedback, (g) asks clarifying questions if context is insufficient. Write in a comprehensive, intelligent, reasoning style. No generic text.",
  "prominentFeatures": [
    {
      "name": "Feature name",
      "description": "Detailed description of what this feature does and why it's important",
      "priority": "high|medium|low",
      "rationale": "Why this feature is needed for this specific project type"
    }
  ],
  "modes": [
    {
      "type": "development|deployment|maintenance|monitoring|cloud|hybrid",
      "description": "Detailed description of this execution mode",
      "selected": true|false,
      "rationale": "Why this mode is recommended"
    }
  ],
  "milestones": [
    {
      "title": "Specific milestone title",
      "description": "Detailed description of what happens in this milestone and why it matters",
      "acceptanceCriteria": ["Specific, measurable criterion 1", "Criterion 2"],
      "estimatedCompletion": "Realistic timeline",
      "dependencies": ["What must be completed first"]
    }
  ],
  "risks": [
    {
      "risk": "Specific risk relevant to this project type",
      "mitigation": "Detailed mitigation strategy",
      "severity": "high|medium|low",
      "probability": "likely|possible|unlikely"
    }
  ],
  "dependencies": [
    {
      "dependency": "Specific dependency (API, service, tool, hardware, etc.)",
      "type": "external|internal|resource|hardware|software|service",
      "status": "pending|resolved|optional",
      "cost": "estimated cost if applicable",
      "alternatives": ["Alternative options if this isn't available"]
    }
  ],
  "instrumentation": [
    {
      "metric": "Specific metric to track",
      "method": "How to measure this",
      "frequency": "How often to track",
      "tools": "Tools or services to use"
    }
  ],
  "acceptanceCriteria": [
    {
      "criterion": "Specific, measurable acceptance criterion",
      "type": "functional|non-functional|performance|security|usability",
      "priority": "must-have|should-have|nice-to-have"
    }
  ]
}

CRITICAL REQUIREMENTS:
- The narrative MUST be 8-15 paragraphs minimum - comprehensive and detailed
- Show intelligent reasoning about project type and requirements
- Provide multiple approaches (smartest/best/cheapest) when relevant
- Mention constraints (hardware, platforms, etc.) specific to project type
- Recommend specific technologies and explain why
- If context is minimal, ask intelligent clarifying questions in the narrative
- All content must be project-specific, not generic
- Prominent features should be listed AFTER the narrative in point form style within the JSON structure
- Be conversational but professional - like a senior architect explaining the plan`;

    const response = await this.generateText(prompt, "openai/gpt-4o-mini", 8000);
    
    try {
      const parsed = JSON.parse(response.content);
      return {
        narrative: parsed.narrative || "Project plan pending review.",
        prominentFeatures: Array.isArray(parsed.prominentFeatures) ? parsed.prominentFeatures : [],
        modes: Array.isArray(parsed.modes) ? parsed.modes : [],
        milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
        instrumentation: Array.isArray(parsed.instrumentation) ? parsed.instrumentation : [],
        acceptanceCriteria: Array.isArray(parsed.acceptanceCriteria) ? parsed.acceptanceCriteria : []
      };
    } catch (error) {
      console.error("Failed to parse reiteration draft:", error);
      // Fallback structure
      const contextText = context?.text || (typeof context === 'string' ? context : JSON.stringify(context));
      return {
        narrative: `Project: ${title}${contextText ? `\n\nDescription: ${contextText}` : ''}\n\nThis project requires careful planning and execution.`,
        prominentFeatures: [{ name: "Core Functionality", description: "Main features", priority: "high" }],
        modes: [{ type: "development", description: "Active development mode", selected: true }],
        milestones: [{ title: "Initial Setup", description: "Project initialization", acceptanceCriteria: [], estimatedCompletion: "1 week" }],
        risks: [{ risk: "Scope creep", mitigation: "Regular reviews", severity: "medium" }],
        dependencies: [],
        instrumentation: [],
        acceptanceCriteria: [{ criterion: "Project meets requirements", type: "functional" }]
      };
    }
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
