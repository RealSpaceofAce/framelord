<objective>
Add audio recording and Whisper transcription to FrameScan scan input, Little Lord chat, and Notes editor.
</objective>

<context>
Users want to record audio and have it transcribed to text. This feature adds:
1. A shared audio recording hook using MediaRecorder API
2. A transcription service using OpenAI Whisper
3. Microphone buttons in FrameScan, Little Lord, and Notes

Use the existing OpenAI client/API utility in the repo. Do not hardcode API keys.

@CLAUDE.md - Project conventions
@src/services/ - Service layer (look for existing AI/OpenAI client)
@src/hooks/ - Custom hooks location
@src/components/Scanner.tsx - FrameScan input
@src/components/crm/FrameScanContactTab.tsx - CRM scan input
@src/components/littleLord/ - Little Lord chat components
@src/components/notes/ - Notes editor components
</context>

<requirements>

## 4.1 Shared Audio Hook

1. Create `src/hooks/useAudioRecorder.ts`:

```typescript
import { useState, useRef, useCallback } from 'react';

export interface UseAudioRecorderResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Could not access microphone');
      console.error('Recording error:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, []);

  return { isRecording, startRecording, stopRecording, error };
}
```

## 4.2 Transcription Service

1. Find the existing AI/OpenAI client in `src/services/` or `src/lib/`
   - Search for files containing "openai", "gemini", or "aiClient"
   - Use the same pattern for API calls

2. Add transcription function (in same file or new `src/services/transcriptionService.ts`):

```typescript
export async function transcribeAudioToText(blob: Blob): Promise<string> {
  // Convert blob to base64 or FormData as needed by the API
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  formData.append('model', 'whisper-1');

  // Use existing API key management pattern
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Transcription failed');
  }

  const data = await response.json();
  return data.text;
}
```

Adapt to match the existing API call patterns in the repo.

## 4.3 FrameScan Audio Button

1. In `src/components/Scanner.tsx` and `src/components/crm/FrameScanContactTab.tsx`:
   - Find the input toolbar near the textarea
   - Add a microphone icon button

2. Behavior:
   - Click when not recording: `startRecording()`, show recording state (red glow, "Recording...")
   - Click when recording: `stopRecording()`, transcribe, append text to textarea

3. Example implementation:
```tsx
import { Mic, MicOff } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { transcribeAudioToText } from '../services/transcriptionService';

// Inside component:
const { isRecording, startRecording, stopRecording, error } = useAudioRecorder();
const [isTranscribing, setIsTranscribing] = useState(false);

const handleMicClick = async () => {
  if (isRecording) {
    const blob = await stopRecording();
    if (blob) {
      setIsTranscribing(true);
      try {
        const text = await transcribeAudioToText(blob);
        setInputText((prev) => prev + (prev ? '\n' : '') + text);
      } catch (err) {
        showToast({ type: 'error', message: 'Transcription failed' });
      } finally {
        setIsTranscribing(false);
      }
    }
  } else {
    await startRecording();
  }
};

// In JSX:
<button
  onClick={handleMicClick}
  disabled={isTranscribing}
  className={isRecording ? 'recording-active' : ''}
>
  {isRecording ? <MicOff /> : <Mic />}
  {isRecording && <span>Recording...</span>}
  {isTranscribing && <span>Transcribing...</span>}
</button>
```

## 4.4 Little Lord Chat Audio Button

1. Find the Little Lord chat composer:
   - Search for `LittleLordChat`, `LittleLordGlobalModal`, or similar
   - Find where user types messages

2. Add microphone button next to send button:
   - Same behavior as FrameScan: tap to start, tap to stop, transcribe, inject into input
   - User can then edit or hit send

## 4.5 Notes Audio Embed

1. Find the Notes editor toolbar:
   - Search for `Start with AI` or editor header
   - Look in `src/components/notes/` or `src/pages/NotesPage.tsx`

2. Add "Record" button in toolbar:
   - Same record/stop pattern using `useAudioRecorder`

3. After transcription, insert audio embed block into note:
   - Convert audio blob to Data URL
   - Insert markdown block:

```markdown
:::audio
[Audio recording – 2025-12-10 14:30]
data-url: data:audio/webm;base64,...
transcript: The transcribed text goes here
:::
```

4. Render this block as:
   - `<audio controls>` element bound to the Data URL
   - "Show transcript" toggle that reveals the text

5. Store audio as Data URL per project architecture (attachments as Data URLs)

</requirements>

<verification>
1. FrameScan input (public and CRM):
   - Microphone button visible
   - Click to start recording (visual feedback)
   - Click again to stop and transcribe
   - Transcribed text appends to textarea

2. Little Lord chat:
   - Microphone button next to send
   - Same record/transcribe flow
   - Text injected into input field

3. Notes editor:
   - Record button in toolbar
   - Records and transcribes
   - Inserts audio embed with player and transcript

4. Error handling:
   - Microphone permission denied shows toast
   - Transcription failure shows toast

```bash
npm run build
```
</verification>

<success_criteria>
- useAudioRecorder hook created and working
- transcribeAudioToText service function created
- Microphone button in Scanner.tsx
- Microphone button in FrameScanContactTab.tsx
- Microphone button in Little Lord chat
- Record button in Notes editor with audio embed insertion
- Audio stored as Data URL in notes
- No TypeScript errors
- Graceful error handling for permissions and API failures
</success_criteria>
