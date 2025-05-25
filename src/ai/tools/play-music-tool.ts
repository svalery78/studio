
/**
 * @fileOverview A Genkit tool for handling music playback requests.
 * This tool simulates finding a song but does not actually play audio.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

export const PlayMusicInputSchema = z.object({
  query: z.string().describe('The user\'s query for a song, which might include song title and/or artist.'),
});
export type PlayMusicInput = z.infer<typeof PlayMusicInputSchema>;

export const PlayMusicOutputSchema = z.object({
  song: z.string().describe('The title of the song identified.'),
  artist: z.string().optional().describe('The artist of the song, if identified.'),
  status: z.enum(['playing_simulation', 'could_not_identify', 'error_in_tool']).describe('Status of the music request handling.'),
});
export type PlayMusicOutput = z.infer<typeof PlayMusicOutputSchema>;

export const playMusicTool = ai.defineTool(
  {
    name: 'playMusic',
    description: 'Identifies a song and artist from a user query. Use this tool when the user asks to play music, a specific song, or an artist. This tool helps determine what music the user wants.',
    inputSchema: PlayMusicInputSchema,
    outputSchema: PlayMusicOutputSchema,
  },
  async (input: PlayMusicInput): Promise<PlayMusicOutput> => {
    console.log('playMusicTool invoked with query:', input.query);
    if (!input.query || input.query.trim() === '') {
      return {
        song: 'Unknown Song',
        status: 'could_not_identify',
      };
    }

    // Simple parsing attempt: "Song Title by Artist Name"
    const bySeparator = " by ";
    let songTitle = input.query;
    let artistName: string | undefined = undefined;

    const queryLower = input.query.toLowerCase();
    const byIndex = queryLower.indexOf(bySeparator);

    if (byIndex !== -1) {
      songTitle = input.query.substring(0, byIndex).trim();
      artistName = input.query.substring(byIndex + bySeparator.length).trim();
    }
    
    if (!songTitle && artistName) { // e.g. "play by Taylor Swift"
        songTitle = "songs"; // placeholder
    } else if (!songTitle) {
        return {
            song: 'Unknown Song',
            status: 'could_not_identify',
        };
    }
    
    return {
      song: songTitle,
      artist: artistName,
      status: 'playing_simulation',
    };
  }
);
