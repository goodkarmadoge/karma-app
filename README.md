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

The source of the application is `dist/index.html`, `styles.css`, `app.js`, `audio-mixer.js`, `store.js`, `account.js`, `config.js`, `practice-day.js`, `streaks.js`, and `scene.js`. All browser assets are self-hosted under `dist/assets/`, and `dist/vendor/` holds supabase-js (MIT).

Includes English captions, a transcript, pause/resume, mute/volume, reduced motion, local practice history, and static artwork fallback. The practice day resets at 01:00 Singapore time. Playback continues when the screen turns off, and the lock screen carries the title, the painting and working play, pause and stop controls.

## Accounts and streaks

Signing in is optional and stays optional. The record in `store.js` is the whole practice record when nobody is signed in and remains what the home screen reads when somebody is, so the app opens, counts a session and shows a streak with no network and no account at all. An account only adds durability: the streak survives a cleared browser and follows the reader to another device.

Sign-in is a magic link, backed by Supabase Auth. **The account is shared with the handscroll build** (`goodkarmadoge/Karma-app-claude`, live at karma-app-woad.vercel.app): one reader, one streak, whichever build they opened. Both builds compute the practice day with the same expression — `Math.floor((ms + 7h) / 24h)`, the boundary at 01:00 Asia/Singapore — so the day sets merge without translation.

Which build a sitting happened in is recorded in `practice_sessions.app` (`daily` here, `handscroll` there), so the two can be compared without splitting anyone's streak. `dist/config.js` carries the project URL, the publishable key and the `APP` tag; all three are meant to be public, since every table is behind row level security.

The server stores **when** each sitting happened and nothing else — see *Streaks and the day boundary* below. Each sitting carries an id the recording device made up, which is what lets a device offer its whole history on every sign-in without the merge counting a sitting twice.

supabase-js loads by dynamic import inside `account.start()` rather than a static import, so 137 kB never sits in front of the painting or the Begin button, and a failed import quietly stops offering sign-in and changes nothing else. The magic link uses the implicit flow rather than PKCE, because PKCE keeps its verifier in the browser that asked for the link and so fails when the link opens in a mail app's in-app browser.

Schema, RLS policies and the two write functions are documented in the handscroll build's README, which is where the migrations live.

### Configuring auth

Under **Authentication -> URL Configuration** in the Supabase project, the redirect allow list must include **both** builds, or a link falls back to the Site URL:

```
https://karma-app-woad.vercel.app/**
https://karma-daily-meditation.vercel.app/**
```

Magic links currently go out through Supabase's own sender, capped at a few an hour and unsupported for production. Enough for testers arriving one at a time; not enough to invite a group at once.

## Streaks and the day boundary

A practice day does not begin at midnight. It begins at an hour the reader picks — **2 AM by default**, anywhere from midnight to 6 AM — so that a sitting finished at 11:44 PM and one finished at 12:15 AM belong to the same day rather than to two. Under a midnight boundary somebody who sits last thing at night loses a day every time they drift past twelve: two nights of practice collapse onto one calendar date and the night between reads as empty.

**Nothing about a streak is stored.** `practice-day.js` turns an instant into a day index; `streaks.js` turns a list of sittings into the current streak, the longest run, the totals and the practised-days set. Both are pure. That is what makes the boundary movable — a stored count would have been computed under whichever boundary was set at the time. Move it in Settings and every figure and every filled square recomputes from the same sittings.

The current streak stays alive if the reader practised **today or yesterday**, because otherwise every streak reads as broken for the whole of each day until the moment its owner sits down — which is precisely when they would be looking at it.

A sitting is timestamped when Begin is pressed rather than when the audio ends, so one begun at 1:55 AM still belongs to the night before. `store.js` is at v3 and migrates v1 and v2 in place; those only recorded whole days under a fixed 01:00 Asia/Singapore boundary, so each becomes the middle of its old day, which lands on the same date under any boundary in range.

The settings dialog holds the streak badge (the ensō, drawn in the count), the stats row, a month calendar with practised days filled in gilt, a **Count my streak** toggle that puts the whole apparatus away, and the boundary picker. The boundary and the toggle are stored against the account rather than the device, because they describe the reader — so they follow them to the handscroll build too.

## Opening and background music

The user-supplied opening cue plays from 0 to 6.912 seconds, at a restrained level. At 8 seconds the requested ElevenLabs voice introduces the session: **This is the Daily Karma.** The remaining meditation follows its original timing. The cue is included in the narration track, so resuming does not replay it.

Five minutes of instrumental music were generated with the ElevenLabs Music API (`music_v1`), using a prompt for soft felt piano, sustained strings, Asian-inspired pentatonic harmony, and a calm water-spa atmosphere. The music is self-hosted as `dist/assets/rest-and-recovery-music.mp3`.

**Music on/off** in the player mutes only the background. The main speaker button mutes all audio. Pausing, exiting, or completing the meditation stops both tracks. Preferences persist on this device.

The bed level and the fade envelope live in the music file rather than in the player: silence under the opening cue, a fade in from six to twelve seconds, and a fade out over the last seven. This is what lets the music keep playing with the screen off, because the alternative is a Web Audio gain node and iOS suspends the audio context on lock. The file was attenuated by -17.1 dB from its ElevenLabs master, which puts the bed at about -32.7 dBFS RMS, roughly 4 dB under the Derek narration.

What remains in the player is ducking to 70% under speech, and the two volume settings. All three depend on `volume` being settable on a media element, which iOS ignores. Where that is the case the sliders are disabled and Settings says why; mute and music on/off still work, and the baked level is chosen to sit correctly with no ducking at all.

## Assets

The delivery audio is a 96 kbps mono MP3, measured by the browser at 300.048 seconds, including intentional pauses. Its original master is exactly 300 seconds. The 48 ms MP3 encoding overhead falls within the specification's 0.1-second tolerance.

The instrumental track is a 128 kbps MP3, measured at approximately 300.069 seconds after the level and envelope were baked in. It follows the narration's playback clock rather than running an independent session timer.

The source painting is optimized as a 220 KB WebP and the display font is subset to approximately 12 KB. Three.js loads after the primary interface. No live TTS requests occur while using the app.

Three.js is vendored with its MIT license. Artwork and narration were provided/generated for this project. The display font is Cormorant Garamond (SIL Open Font License).

## Verification

Checked in the Codex in-app browser: playback, updated opening captions, synchronized music, independent music mute, pause/resume, settings, transcript, and mobile layout. Automated checks cover audio duration, cue separation, music fading/ducking, synchronization, settings persistence, daily history, asset references, and the absence of API credentials in the app. An earlier full five-minute browser run verified the completion flow. Physical iOS/Android testing and Lighthouse scoring remain outstanding.

## Narrator selection
Settings → Narrator offers Derek (male, ElevenLabs 0X63EirRQmRS0K8fLhOQ) and Sarah (female, EXAVITQu4vr4xnSDxMaL). Both are generated recordings of the same script, including “This is the Daily Karma.” Each lasts five minutes and includes the supplied opening cue. Switching narrators pauses and resets the meditation to the beginning; press Resume to start the selected version. Selection is saved on this device. Each voice has its own timed captions and music ducking cues. Music preferences remain independent.

## Interactive artwork
The twelve paintings are mounted side by side on paper and seen through a shallow perspective camera, the way a handscroll is opened. The painting in front lies flat and is alive; its neighbours turn a little away, recede and fade almost entirely into the paper. Drag sideways, flick, use the mouse wheel, the arrow keys or the chevrons to move along the scroll; a flick moves one painting and a slow release snaps to the nearest, with the ends rubber-banded.

Each painting declares its own motions in `dist/scene.js`, in image coordinates: drifting mist and cloud bands, a masked water shimmer with optional flow and up to two standing ripple rings, up to two wind regions anchored on one edge so a reed bends from its root and a bough bobs at its tip, falling leaves or petals, a light that breathes, and sparks that are either fireflies or moonlight on water.

Touch is answered in kind. Tapping foliage sends a gust through that region and loosens a few leaves where the tap landed; tapping a lantern or the moon flares it; tapping water opens a ring that spreads and refracts what is under it. Bare paper is left alone. The koi sway is deliberately below the threshold that counts as foliage, so the pool answers as water. Everything is scaled by the session phase, so the scene is at its fullest in the middle of the five minutes and almost still by the end, and the reduced-motion setting stops all of it while leaving the chevrons and arrow keys working.
