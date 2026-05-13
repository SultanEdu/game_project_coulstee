import { useState } from "react";
import { speak, stopSpeech } from "@/lib/game/audio";
import { Volume2, VolumeX } from "lucide-react";

export function NarratorButton({ text }: { text: string }) {
  const [on, setOn] = useState(false);
  const toggle = () => {
    if (on) { stopSpeech(); setOn(false); }
    else { speak(text); setOn(true); setTimeout(() => setOn(false), text.length * 90); }
  };
  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-mahogany gold-frame text-gold text-xs font-sans uppercase tracking-wider"
    >
      {on ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      Narator
    </button>
  );
}