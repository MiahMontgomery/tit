import { Template } from './types.js';
import { personaBasic } from './persona/basic/index.js';

const registry: Record<string, Template> = {
  'persona/basic': personaBasic
};

export function resolveTemplate(ref?: string): Template {
  return registry[ref || 'persona/basic'];
}