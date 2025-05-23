"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SELFIE_STYLES } from '@/lib/constants';
import { Image as ImageIcon, Sparkles, Send, MapPin } from 'lucide-react';

interface SelfieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateSelfie: (style: string, location: string) => void;
  isGenerating: boolean;
}

export function SelfieModal({ isOpen, onClose, onGenerateSelfie, isGenerating }: SelfieModalProps) {
  const [selectedStyle, setSelectedStyle] = useState(SELFIE_STYLES[0].value);
  const [locationInput, setLocationInput] = useState('');

  const handleGenerate = () => {
    if (selectedStyle && !isGenerating) {
      onGenerateSelfie(selectedStyle, locationInput);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Generate AI Selfie
          </DialogTitle>
          <DialogDescription>
            Choose a style and optionally specify a location for the selfie.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="style" className="text-right col-span-1 shrink-0">
              Style
            </Label>
            <Select value={selectedStyle} onValueChange={setSelectedStyle} disabled={isGenerating}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                {SELFIE_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right col-span-1 shrink-0">
              Location
            </Label>
            <div className="col-span-3 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="E.g., at the beach, in a park"
                className="pl-10"
                disabled={isGenerating}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !selectedStyle} variant="default">
            {isGenerating ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Get Selfie
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
