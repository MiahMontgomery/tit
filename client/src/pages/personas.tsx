import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import TitanLogo from '@/components/titan-logo';
import { Button } from '@/components/ui/button';
import PersonaCard from '@/components/persona-card';
import PersonaModal from '@/components/persona-modal';

interface Persona {
  id: string;
  slug: string;
  name: string;
  role?: string;
  voiceAgentId?: string;
  apiKeys?: Record<string, string>;
}

const PERSONAS_STORAGE_KEY = 'titan_personas';

function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || '';
        const res = await fetch(`${apiBase}/api/personas`);
        if (res.ok) {
          const json = await res.json();
          const list = json.data || [];
          setPersonas(list);
          localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(list));
          return;
        }
      } catch (err) {
        // ignore
      }
      const cached = localStorage.getItem(PERSONAS_STORAGE_KEY);
      if (cached) {
        setPersonas(JSON.parse(cached));
      }
    }
    load();
  }, []);

  function handleCreate(persona: Persona) {
    setPersonas(prev => {
      const updated = [...prev, persona];
      localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TitanLogo />
          <h1 className="text-3xl font-bold text-[#40e0d0]">Personas</h1>
        </div>
        <Button
          variant="outline"
          style={{ borderColor: '#40e0d0', color: '#40e0d0' }}
          onClick={() => setIsModalOpen(true)}
        >
          + Add Persona
        </Button>
      </div>

      {personas.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map(p => (
            <PersonaCard key={p.slug} persona={p} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400">No personas yet.</p>
      )}

      <PersonaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}

export default PersonasPage;
