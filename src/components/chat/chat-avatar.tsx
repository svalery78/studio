import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bot } from "lucide-react";

interface ChatAvatarProps {
  sender: 'user' | 'ai';
  name?: string;
  imageUrl?: string;
}

export function ChatAvatar({ sender, name, imageUrl }: ChatAvatarProps) {
  const fallbackName = name ? name.substring(0, 1).toUpperCase() : (sender === 'user' ? 'U' : 'AI');

  return (
    <Avatar className="h-10 w-10 shadow-sm">
      {imageUrl ? (
        <AvatarImage src={imageUrl} alt={`${name || sender} avatar`} />
      ) : (
        <AvatarFallback className={sender === 'user' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}>
          {sender === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
