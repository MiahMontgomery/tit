import React from 'react';
import TitanLogo from '@/components/titan-logo';
import { Button } from '@/components/ui/button';

function PersonasPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TitanLogo />
          <h1 className="text-3xl font-bold text-[#40e0d0]">Persona</h1>
        </div>
        <Button
          variant="outline"
          style={{ borderColor: '#40e0d0', color: '#40e0d0' }}
          onClick={() => {
            // placeholder for Add Persona modal
          }}
        >
          + Add Persona
        </Button>
      </div>
      <div className="text-center text-gray-400">
        {/* Placeholder for persona cards */}
        No personas yet.
      </div>
    </div>
  );
}

export default PersonasPage;
