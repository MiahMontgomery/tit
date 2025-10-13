import React from 'react';
import { useRoute } from 'wouter';

function PersonaPage() {
  const [, params] = useRoute('/personas/:slug');
const slug = params ? (params as any).slug : undefined;
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-[#40e0d0] mb-4">Persona Details</h1>
      <p className="text-gray-400">Persona slug: {slug}</p>
      <p className="text-gray-400">This page will display the Persona dashboard.</p>
    </div>
  );
}

export default PersonaPage;
