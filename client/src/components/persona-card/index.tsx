import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Link } from 'wouter';

interface PersonaSummary {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
}

interface PersonaCardProps {
  persona: PersonaSummary;
}

export default function PersonaCard({ persona }: PersonaCardProps) {
  return (
    <Link href={`/personas/${persona.id}`} className="hover:bg-muted flex flex-col cursor-pointer">
      <Card>
        <CardHeader>
          <CardTitle>{persona.name}</CardTitle>
          {persona.description && <CardDescription>{persona.description}</CardDescription>}
        </CardHeader>
      </Card>
    </Link>
  );
}
