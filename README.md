# Karma

A static HTML5 meditation app with Three.js artwork effects and a complete, pre-generated five-minute ElevenLabs meditation. Serve `dist/` using any static HTTP server. No build step or runtime API key is required.

The source of the application is `dist/index.html`, `styles.css`, `app.js`, `store.js`, and `scene.js`. All browser assets are self-hosted under `dist/assets/`.

Includes English captions, a transcript, pause/resume, mute/volume, reduced motion, local practice history, and static artwork fallback. The practice day resets at 01:00 Singapore time. Backgrounding the app pauses playback.

Three.js is vendored with its MIT license. Artwork and narration were provided/generated for this project. The display font is Cormorant Garamond (SIL Open Font License).
