import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";

export interface PersonaSummary {
  id: string;
  name: string;
  role: string;
  createdAt: string | Date;
}

interface PersonaCardProps {
  persona: PersonaSummary;
}

/**
 * Lightweight card component for displaying a persona summary.  Clicking the card
 * navigates to the persona detail page via wouter's Link component.
 */
export default function PersonaCard({ persona }: PersonaCardProps) {
  return (
    <Link href={`/personas/${persona.id}`} className="block">
      <Card className="hover:border-[#40e0d0] transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle className="text-xl">{persona.name}</CardTitle>
          <CardDescription className="text-sm">{persona.role}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
