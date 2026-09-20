# Karma

A static HTML5 meditation app with Three.js artwork effects and a complete, pre-generated five-minute ElevenLabs meditation. Serve `dist/` using any static HTTP server. No build step or runtime API key is required.

## Daily guided meditation automation

`.github/workflows/daily-meditation.yml` runs every day at 6:00 AM in `Asia/Singapore` and can also be started manually from GitHub Actions. It rotates through Karma, Patience, Deliberation, Exploration, Equanimity, Non-attachment, Right Effort, and Compassion. Each run writes a new five-minute English practice, generates it with ElevenLabs in both Derek and Sarah voices, preserves the opening cue, and publishes synchronized transcripts and captions.

Add the ElevenLabs credential as the repository Actions secret `ELEVENLABS_API_KEY`. The key is never shipped to the browser or committed to Git. Audio replaces the two files in the stable `daily` GitHub Release, avoiding daily binary growth in Git history. The small dated manifest, transcripts, and captions are committed to `main`, which triggers the connected Vercel production deployment. The app keeps its bundled meditation as a fallback until a daily manifest is available.

Run `node scripts/generate-daily-meditation.mjs --check` to validate and preview today's script without making an API request. A normal run requires FFmpeg and `ELEVENLABS_API_KEY`.

## Vercel deployment

Import this repository in Vercel. `vercel.json` selects the static `dist/` directory and does not run a build command. The published app contains the meditation, its artwork, and self-hosted audio; it does not include the separate ThreeUI motion experiment.

## Run locally

From this folder, run `python serve.py`, then visit `http://127.0.0.1:4173`. The included server supports byte-range requests, which the audio player needs for reliable music synchronization. Use an HTTP server rather than opening the HTML as a `file://` URL, because the app uses JavaScript modules. A production static host must also support byte-range requests for MP3 files.

The source of the application is `dist/index.html`, `styles.css`, `app.js`, `audio-mixer.js`, `store.js`, and `scene.js`. All browser assets are self-hosted under `dist/assets/`.

Includes English captions, a transcript, pause/resume, mute/volume, reduced motion, local practice history, and static artwork fallback. The practice day resets at 01:00 Singapore time. Backgrounding the app pauses playback.

## Opening and background music

The user-supplied opening cue plays from 0 to 6.912 seconds, at a restrained level. At 8 seconds the requested ElevenLabs voice introduces the session: **This is the Daily Karma.** The remaining meditation follows its original timing. The cue is included in the narration track, so resuming does not replay it.

Five minutes of instrumental music were generated with the ElevenLabs Music API (`music_v1`), using a prompt for soft felt piano, sustained strings, Asian-inspired pentatonic harmony, and a calm water-spa atmosphere. The music is self-hosted as `dist/assets/rest-and-recovery-music.mp3`.

**Music on/off** in the player mutes only the background. Settings offer separate narration and music volume controls; music defaults to 22%. The main speaker button mutes all audio. Music fades in after the opening cue, ducks to 45% of its chosen level during narration, and fades out over the last seven seconds. Pausing, exiting, or completing the meditation stops both tracks. Music preference and volume persist on this device.

## Assets

The delivery audio is a 96 kbps mono MP3, measured by the browser at 300.048 seconds, including intentional pauses. Its original master is exactly 300 seconds. The 48 ms MP3 encoding overhead falls within the specification's 0.1-second tolerance.

The instrumental track is a 128 kbps MP3, measured at approximately 300.042 seconds. It follows the narration's playback clock rather than running an independent session timer.

The source painting is optimized as a 220 KB WebP and the display font is subset to approximately 12 KB. Three.js loads after the primary interface. No live TTS requests occur while using the app.

Three.js is vendored with its MIT license. Artwork and narration were provided/generated for this project. The display font is Cormorant Garamond (SIL Open Font License).

## Verification

Checked in the Codex in-app browser: playback, updated opening captions, synchronized music, independent music mute, pause/resume, settings, transcript, and mobile layout. Automated checks cover audio duration, cue separation, music fading/ducking, synchronization, settings persistence, daily history, asset references, and the absence of API credentials in the app. An earlier full five-minute browser run verified the completion flow. Physical iOS/Android testing and Lighthouse scoring remain outstanding.

## Narrator selection
Settings → Narrator offers Derek (male, ElevenLabs 0X63EirRQmRS0K8fLhOQ) and Sarah (female, EXAVITQu4vr4xnSDxMaL). Both are generated recordings of the same script, including “This is the Daily Karma.” Each lasts five minutes and includes the supplied opening cue. Switching narrators pauses and resets the meditation to the beginning; press Resume to start the selected version. Selection is saved on this device. Each voice has its own timed captions and music ducking cues. Music preferences remain independent.

## Interactive artwork
The bundled Three.js scene opens with the supplied monochrome meditation painting, followed by the 11 color paintings selected from the user's generated image folder. Other monochrome paintings are excluded. Use the previous/next artwork buttons, scroll over the painting, or swipe vertically to browse. Each painting crossfades into the next. Tapping a painted tree or branch makes it rustle; tapping water creates a horizontally stretched ripple that follows the painted water plane. Yellow trees shed small yellow leaves, the maple sheds vermilion leaves, and blossoms use muted pink petals. Birds move almost imperceptibly, koi shift with the current, and lantern and lotus scenes have a gentle light pulse. The still-artwork preference and system reduced-motion setting disable continuous animation while keeping scene selection available.
