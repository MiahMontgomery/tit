import { Template } from './types.js';
import { personaBasic } from './persona/basic/index.js';

const registry: Record<string, Template> = {
  'basic': personaBasic,
  'persona/basic': personaBasic // Alias for backward compatibility
};

export function resolveTemplate(ref?: string): Template {
  // Default to 'basic' if no ref provided
  const templateRef = ref || 'basic';
  const template = registry[templateRef];
  
  if (!template) {
    throw new Error(`Template not found: ${templateRef}. Available templates: ${Object.keys(registry).join(', ')}`);
  }
  
  return template;
}