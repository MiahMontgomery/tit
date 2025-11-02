import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EditPanelProps {
  draft: any;
  userEdits: string;
  onEditsChange: (edits: string) => void;
}

export function EditPanel({ draft, userEdits, onEditsChange }: EditPanelProps) {
  return (
    <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#e0e0e0' }}>
          <AlertCircle className="h-5 w-5" style={{ color: '#f59e0b' }} />
          Request Changes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="edits" className="text-sm font-medium mb-2 block" style={{ color: '#e0e0e0' }}>
            What would you like to change?
          </Label>
          <Textarea
            id="edits"
            value={userEdits}
            onChange={(e) => onEditsChange(e.target.value)}
            placeholder="Tell me what you'd like to change in simple language. Examples: 'I don't like this approach, it should be cloud-based instead', 'Add more details about the mobile app features', 'This is too expensive, show me cheaper options', 'I want it to work offline', etc. Speak naturally - the system will understand your feedback."
            className="min-h-[150px]"
            style={{ 
              backgroundColor: '#111111', 
              borderColor: '#333333', 
              color: '#e0e0e0' 
            }}
          />
          <p className="text-xs mt-2" style={{ color: '#888888' }}>
            Your feedback will be used to generate an improved version of the project plan.
          </p>
        </div>

        {draft.version > 1 && (
          <div className="p-3 rounded border" style={{ backgroundColor: '#050505', borderColor: '#333333' }}>
            <p className="text-sm" style={{ color: '#888888' }}>
              This will create version {draft.version + 1} of the project plan.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

