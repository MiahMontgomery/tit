import { Template } from '../types.js';
import { personaBasicTemplate } from './persona/basic/index.js';

const registry: Record<string, Template> = {
  'persona/basic': personaBasicTemplate
};

export function resolveTemplate(ref?: string): Template {
  return registry[ref || 'persona/basic'];
}

export { registry };
