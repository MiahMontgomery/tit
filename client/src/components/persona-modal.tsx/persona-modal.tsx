import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

interface PersonaModalProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Called when the modal should be closed */
  onClose: () => void;
  /** Optional callback fired after a persona is successfully created */
  onCreated?: (personaProject: any) => void;
}

/**
 * Modal for creating a new persona.  This component collects a name, role and
 * optional description for the persona and sends a POST request to
 * `/api/personas` when submitted.  On success it invokes the optional
 * `onCreated` callback with the returned persona project data and then
 * closes itself.
 */
export default function PersonaModal({ isOpen, onClose, onCreated }: PersonaModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setName("");
    setRole("");
    setDescription("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/personas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          description: description.trim(),
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create persona");
      }
      const result = await response.json();
      if (onCreated) {
        onCreated(result.data);
      }
      handleClose();
    } catch (error) {
      console.error("Error creating persona:", error);
      // If the API call fails (e.g. backend unavailable), create a persona locally
      const fallbackPersona = {
        id: Date.now().toString(),
        name: name.trim(),
        role: role.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
        apiKeys: [],
      };
      if (onCreated) {
        onCreated(fallbackPersona);
      }
      handleClose();
      alert("Persona created locally (backend unavailable). Changes may not persist on server.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: '#e0e0e0' }}>
              Create New Persona
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              style={{ color: '#888888' }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="persona-name" className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
                Name
              </Label>
              <Input
                id="persona-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter persona name"
                className="mt-1"
                style={{
                  backgroundColor: '#111111',
                  borderColor: '#333333',
                  color: '#e0e0e0',
                }}
                required
              />
            </div>
            <div>
              <Label htmlFor="persona-role" className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
                Role
              </Label>
              <Input
                id="persona-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Enter persona role (e.g. Frontend Dev, Sales Agent)"
                className="mt-1"
                style={{
                  backgroundColor: '#111111',
                  borderColor: '#333333',
                  color: '#e0e0e0',
                }}
                required
              />
            </div>
            <div>
              <Label htmlFor="persona-description" className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
                Description (optional)
              </Label>
              <Textarea
                id="persona-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this persona's background or goals..."
                className="mt-1 min-h-[120px]"
                style={{
                  backgroundColor: '#111111',
                  borderColor: '#333333',
                  color: '#e0e0e0',
                }}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                style={{
                  borderColor: '#333333',
                  color: '#e0e0e0',
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: '#40e0d0',
                  color: '#000000',
                }}
              >
                {isLoading ? 'Creating...' : 'Create Persona'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
