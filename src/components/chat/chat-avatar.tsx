
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bot } from "lucide-react";
import type { AppSettings } from "@/lib/constants"; // Import AppSettings

interface ChatAvatarProps {
  sender: 'user' | 'ai';
  name?: string;
  appSettings?: AppSettings | null; // Pass full appSettings or just selectedAvatarDataUri
}

export function ChatAvatar({ sender, name, appSettings }: ChatAvatarProps) {
  const fallbackName = name ? name.substring(0, 1).toUpperCase() : (sender === 'user' ? 'U' : 'AI');
  const aiAvatarUrl = appSettings?.selectedAvatarDataUri;

  return (
    <Avatar className="h-10 w-10 shadow-sm">
      {(sender === 'ai' && aiAvatarUrl) ? (
        <AvatarImage
          src={aiAvatarUrl}
          alt={`${name || 'AI'} avatar`}
          data-ai-hint="ai girlfriend avatar" // Keep a generic hint
        />
      ) : (
        <AvatarFallback className={sender === 'user' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}>
          {sender === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

