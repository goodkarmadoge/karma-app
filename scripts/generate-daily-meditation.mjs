import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const ASSETS = path.join(ROOT, 'dist', 'assets');
const OUTPUT = path.join(ROOT, '.daily-output');
const TMP = path.join(OUTPUT, 'tmp');
const DURATION_SECONDS = 300;
const SAMPLE_RATE = 24000;
const BYTES_PER_SAMPLE = 2;
const CUE_STARTS = [8, 32, 58, 84, 111, 140, 168, 196, 235, 257, 283];
const RELEASE_BASE = 'https://github.com/goodkarmadoge/karma-app/releases/download/daily';

const voices = [
  { narrator: 'derek', label: 'Derek', voiceId: '0X63EirRQmRS0K8fLhOQ' },
  { narrator: 'sarah', label: 'Sarah', voiceId: 'EXAVITQu4vr4xnSDxMaL' },
];

// The library. Entries carrying a `source` field are authored in the handscroll
// build and written here by its scripts/export-library.mjs; edit those there.
const themes = JSON.parse(await readFile(new URL('./themes.json', import.meta.url), 'utf8'));

function singaporeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function themeFor(date) {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  return themes[((day % themes.length) + themes.length) % themes.length];
}

const settleVariations = [
  'Feel the surface beneath you. Unclench your jaw. Let your shoulders settle. For these five minutes, there is nowhere else you need to be.',
  'Notice the weight of your body being held. Let the tongue rest and the shoulders fall. Allow this moment to ask nothing from you.',
  'Feel where your body meets the chair or floor. Soften your hands. Give gravity permission to carry a little more of your weight.',
  'Settle into a position that can support both ease and alertness. Relax the muscles around your eyes and let the day become quieter.',
];

const breathVariations = [
  'Notice one breath arriving and one breath leaving. Do not improve it. Let each breath return you to the direct experience of this moment.',
  'Follow the next inhale from its beginning, then the exhale to its end. Let the breath be natural, unforced, and entirely enough.',
  'Feel the quiet rhythm of breathing. When the mind moves ahead, come back to one simple inhale and one unhurried exhale.',
  'Place attention where breathing feels clearest: the nose, chest, or belly. Receive each breath without needing to hold on to it.',
];

const silenceVariations = [
  'For a little while, I will be quiet. Let thoughts pass like weather over a wide landscape. When attention wanders, return with patience.',
  'Now rest in a short silence. Sounds, sensations, and thoughts may come and go. Let awareness remain spacious around them.',
  'I will leave some quiet here. You do not need to empty the mind. Notice what appears, release the story, and return to breathing.',
];

const closingVariations = [
  'Feel the room around you. Move your fingers when you are ready. Let your eyes open gently. Thank you for practicing with Karma.',
  'Notice the sounds around you. Invite movement back into your hands and feet. Open your eyes softly. Thank you for meeting this day with Karma.',
  'Take one fuller breath. Feel the space beyond your body and let your eyes open in their own time. Thank you for practicing with Karma.',
  'Return awareness to the room. Move slowly, keeping a trace of this steadiness with you. When ready, open your eyes. Thank you for practicing with Karma.',
];

function scriptFor(theme, dayNumber) {
  return [
    `This is the Daily Karma. Today’s practice is ${theme.topic.toLowerCase()}: ${theme.title.toLowerCase()}. Find a supported position. Let your eyes close, or rest gently on the painting.`,
    settleVariations[dayNumber % settleVariations.length],
    breathVariations[Math.floor(dayNumber / settleVariations.length) % breathVariations.length],
    theme.principle,
    theme.image,
    'Notice what your body is doing with these words. Soften around the eyes, the hands, and the belly. Keep only the effort needed to stay present.',
    theme.inquiry,
    silenceVariations[dayNumber % silenceVariations.length],
    'Still here. Still breathing. Nothing special needs to happen. This quiet awareness is already a useful way of meeting your life.',
    theme.action,
    closingVariations[Math.floor(dayNumber / themes.length) % closingVariations.length],
  ];
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

function timecode(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function vttFor(cues) {
  return `WEBVTT\n\n${cues.map((cue, index) => `${index + 1}\n${timecode(cue.start)} --> ${timecode(cue.end)}\n${cue.text}\n`).join('\n')}`;
}

async function requestSpeech(text, voiceId, previousText = '') {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=pcm_24000`;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(url, {
        method: 'POST', signal: controller.signal,
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json', Accept: 'audio/pcm',
        },
        body: JSON.stringify({
          text, previous_text: previousText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.68, similarity_boost: 0.8, style: 0.08, use_speaker_boost: true, speed: 0.88 },
        }),
      });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      const detail = (await response.text()).slice(0, 400);
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4) {
        throw new Error(`ElevenLabs returned ${response.status}: ${detail}`);
      }
    } catch (error) {
      if (attempt === 4) throw error;
    } finally {
      clearTimeout(timer);
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 3000));
  }
  throw new Error('ElevenLabs request failed');
}

async function buildNarrator(voice, texts, openingPcm) {
  const master = Buffer.alloc(DURATION_SECONDS * SAMPLE_RATE * BYTES_PER_SAMPLE);
  openingPcm.copy(master, 0, 0, Math.min(openingPcm.length, master.length));
  const cues = [];
  let previousText = '';

  for (let index = 0; index < texts.length; index += 1) {
    process.stdout.write(`Generating ${voice.label} cue ${index + 1}/${texts.length}\n`);
    const pcm = await requestSpeech(texts[index], voice.voiceId, previousText);
    if (pcm.length % 2) throw new Error(`Odd PCM byte length for ${voice.label} cue ${index + 1}`);
    const duration = pcm.length / BYTES_PER_SAMPLE / SAMPLE_RATE;
    const start = CUE_STARTS[index];
    const nextStart = CUE_STARTS[index + 1] ?? DURATION_SECONDS;
    if (start + duration > nextStart - 1.5) {
      throw new Error(`${voice.label} cue ${index + 1} is ${duration.toFixed(2)}s and overlaps the next cue`);
    }
    pcm.copy(master, start * SAMPLE_RATE * BYTES_PER_SAMPLE);
    cues.push({ start, end: Number((start + duration).toFixed(3)), text: texts[index] });
    previousText = texts[index];
  }

  const rawPath = path.join(TMP, `${voice.narrator}.pcm`);
  const mp3Path = path.join(OUTPUT, `meditation-${voice.narrator}.mp3`);
  await writeFile(rawPath, master);
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', String(SAMPLE_RATE), '-ac', '1', '-i', rawPath, '-c:a', 'libmp3lame', '-b:a', '64k', mp3Path]);
  return cues;
}

async function main() {
  const date = singaporeDate();
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const theme = themeFor(date);
  const texts = scriptFor(theme, dayNumber);
  if (texts.length !== CUE_STARTS.length || texts.some(text => !text.trim())) throw new Error('Meditation template is incomplete');

  if (process.argv.includes('--check')) {
    console.log(JSON.stringify({ date, theme, cueStarts: CUE_STARTS, cues: texts }, null, 2));
    return;
  }
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is required');

  try {
    const existing = JSON.parse(await readFile(path.join(ASSETS, 'daily-meditation.json'), 'utf8'));
    if (existing.date === date && process.env.FORCE_GENERATE !== '1') {
      console.log(`Daily meditation for ${date} already exists; nothing to do.`);
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(TMP, { recursive: true });
  const openingPcmPath = path.join(TMP, 'opening-cue.pcm');
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(ASSETS, 'opening-cue.mp3'), '-f', 's16le', '-acodec', 'pcm_s16le', '-ac', '1', '-ar', String(SAMPLE_RATE), openingPcmPath]);
  const openingPcm = await readFile(openingPcmPath);

  const generated = [];
  for (const voice of voices) generated.push({ voice, cues: await buildNarrator(voice, texts, openingPcm) });

  for (const { voice, cues } of generated) {
    const metadata = {
      date, durationSeconds: DURATION_SECONDS, voiceId: voice.voiceId,
      narrator: voice.narrator, title: theme.title, topic: theme.topic,
      tradition: theme.tradition, cues,
    };
    await writeFile(path.join(ASSETS, `meditation-${voice.narrator}.json`), `${JSON.stringify(metadata, null, 2)}\n`);
    await writeFile(path.join(ASSETS, `meditation-${voice.narrator}.vtt`), vttFor(cues));
  }

  const manifest = {
    date, title: theme.title, topic: theme.topic, tradition: theme.tradition,
    durationSeconds: DURATION_SECONDS, generatedAt: new Date().toISOString(),
    audioBaseUrl: RELEASE_BASE,
    narrators: Object.fromEntries(voices.map(voice => [voice.narrator, { label: voice.label, voiceId: voice.voiceId }])),
  };
  await writeFile(path.join(ASSETS, 'daily-meditation.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await rm(TMP, { recursive: true, force: true });
  console.log(`Generated ${theme.topic}: ${theme.title} for ${date}`);
}

await main();
