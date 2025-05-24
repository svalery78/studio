
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppSettings } from "@/lib/constants";
import { DEFAULT_PERSONALITY_TRAITS, DEFAULT_TOPIC_PREFERENCES, DEFAULT_USERNAME, DEFAULT_APPEARANCE_DESCRIPTION } from "@/lib/constants";
import { Palette, Save } from "lucide-react";

const settingsFormSchema = z.object({
  userName: z.string().min(1, "Your name is required.").max(50, "Name too long."),
  personalityTraits: z.string().min(10, "Describe personality a bit more.").max(500, "Description too long."),
  topicPreferences: z.string().min(10, "Describe topic preferences a bit more.").max(500, "Description too long."),
  appearanceDescription: z.string().min(20, "Describe appearance in more detail (at least 20 characters).").max(1000, "Description too long."),
});

// This type is for form values only, AppSettings might have more fields (like selectedAvatarDataUri)
export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface SettingsFormProps {
  initialSettings?: Partial<AppSettings>; // Use Partial as not all settings might be present initially
  onSubmit: (data: SettingsFormValues) => void; // onSubmit now takes only form values
  isSubmitting: boolean;
}

export function SettingsForm({ initialSettings, onSubmit, isSubmitting }: SettingsFormProps) {
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      userName: initialSettings?.userName || DEFAULT_USERNAME,
      personalityTraits: initialSettings?.personalityTraits || DEFAULT_PERSONALITY_TRAITS,
      topicPreferences: initialSettings?.topicPreferences || DEFAULT_TOPIC_PREFERENCES,
      appearanceDescription: initialSettings?.appearanceDescription || DEFAULT_APPEARANCE_DESCRIPTION,
    },
  });

  function handleSubmit(data: SettingsFormValues) {
    onSubmit(data);
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Customize Your AI Companion</CardTitle>
        <CardDescription>
          Tell us about yourself, your AI's personality, and how you'd like her to look.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name / Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Alex, Sunshine" {...field} />
                  </FormControl>
                  <FormDescription>How should your AI girlfriend address you?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personalityTraits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Personality Traits</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Humorous, supportive, intellectual, adventurous..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe the kind of personality you'd like your AI girlfriend to have.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="topicPreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Topic Preferences</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Movies, books, travel, technology, philosophy..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    What topics are you interested in discussing?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="appearanceDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Appearance Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe her hair color, eye color, style, etc. Be descriptive for best results!"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Based on this, AI will generate some initial looks for you to choose from.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting} variant="default">
              <Palette className="mr-2 h-4 w-4" />
              {isSubmitting ? "Generating Looks..." : "Next: Choose Her Look"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

