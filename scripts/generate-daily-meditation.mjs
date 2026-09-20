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
  { narrator: 'derek', label: 'Derek', voiceId: 'TkWPqputI7tf9YDFpxF3' },
  { narrator: 'sarah', label: 'Sarah', voiceId: 'EXAVITQu4vr4xnSDxMaL' },
];

const themes = [
  {
    topic: 'Karma', title: 'Intention Before Action', tradition: 'Karma yoga inspired practice',
    principle: 'Karma begins with intention. Before an action becomes a result, it is a choice about what we place into the world.',
    image: 'Imagine a single seed resting in dark soil. It does not rush toward the light. It receives water, warmth, and time, then responds.',
    inquiry: 'Notice one intention beneath today’s effort. It may be to contribute, to learn, or to care. Let the intention become simple and honest.',
    action: 'Choose one small action that matches your intention. A thoughtful reply. A patient beginning. A promise kept without needing recognition.',
  },
  {
    topic: 'Patience', title: 'Trust the Season', tradition: 'Zen inspired practice',
    principle: 'Patience is active steadiness. It lets wise action ripen without demanding that every result arrive now.',
    image: 'Picture bamboo moving in a light wind. It bends, returns, and keeps growing through seasons that cannot be hurried.',
    inquiry: 'Bring to mind one result you have been pressing toward. Feel the energy of that effort, then loosen your grip around the timetable.',
    action: 'Choose the next faithful step and let it be enough. Progress can be quiet. A path still unfolds when you walk it without strain.',
  },
  {
    topic: 'Deliberation', title: 'The Clear Pause', tradition: 'Daoist inspired practice',
    principle: 'Deliberation creates space between impulse and action. In that space, what matters can become easier to see.',
    image: 'Imagine a cup of cloudy water resting on a table. Left undisturbed, the sediment settles and the water becomes clear by itself.',
    inquiry: 'Notice a decision asking for your attention. You do not need to solve it now. Let the facts, feelings, and values rest beside one another.',
    action: 'Carry one clear question into the day: what choice creates the least unnecessary force? Let your answer arrive at a human pace.',
  },
  {
    topic: 'Exploration', title: 'Beginner’s Mind', tradition: 'Zen inspired practice',
    principle: 'A beginner’s mind meets experience before naming it. Curiosity opens paths that certainty can overlook.',
    image: 'Picture a mountain trail disappearing into morning mist. You cannot see the whole route, yet the next stone is visible beneath your feet.',
    inquiry: 'Notice where certainty has become tight. Allow one familiar problem to become new again. What have you not yet asked or noticed?',
    action: 'Take one curious step today. Listen before concluding. Try a smaller experiment. Let discovery matter more than appearing certain.',
  },
  {
    topic: 'Equanimity', title: 'A Steady Center', tradition: 'Buddhist inspired practice',
    principle: 'Equanimity is a balanced heart. It makes room for difficulty and delight without being carried away by either one.',
    image: 'Imagine a mountain reflected in changing water. Wind alters the reflection, while the mountain remains grounded beneath the open sky.',
    inquiry: 'Notice what is pulling you forward or pushing you away. Name it gently, without making it an enemy or a command.',
    action: 'Meet one changing moment with a steady response. Pause, feel your feet, and choose the action that respects the whole situation.',
  },
  {
    topic: 'Non-attachment', title: 'Open Hands', tradition: 'Eastern philosophy inspired practice',
    principle: 'Non-attachment means caring fully without trying to possess every outcome. Effort can be sincere while the hands remain open.',
    image: 'Picture an autumn leaf carried along a clear stream. The water holds it for a while, then lets it continue around the bend.',
    inquiry: 'Bring to mind one outcome you are holding tightly. Keep the care, the skill, and the effort. Soften the demand for certainty.',
    action: 'Do the work that belongs to you, then release the part that does not. Leave a little room for life to answer in its own way.',
  },
  {
    topic: 'Right Effort', title: 'Effort Without Strain', tradition: 'Buddhist inspired practice',
    principle: 'Right effort is energy guided by wisdom. It supports what is helpful and stops feeding what leaves the mind depleted.',
    image: 'Imagine a gardener tending a small courtyard. Water goes where it is needed. Weeds are removed gently. Growth is invited, not forced.',
    inquiry: 'Notice where effort feels clean and where it feels contracted. Your body often knows the difference before your thoughts explain it.',
    action: 'Give today’s best energy to one meaningful task. Let one unnecessary struggle wait. Sustainable effort is a form of respect.',
  },
  {
    topic: 'Compassion', title: 'Strength with Warmth', tradition: 'Metta inspired practice',
    principle: 'Compassion joins clear seeing with the wish to reduce suffering. It is warmth with boundaries, courage, and practical action.',
    image: 'Picture a lantern beside a dark path. It does not light the whole journey. It offers enough warmth and clarity for the next few steps.',
    inquiry: 'Notice the person within you who has been working hard. Speak inwardly with the same steadiness you would offer a trusted friend.',
    action: 'Let one choice today combine strength with warmth. Be direct without becoming hard. Be kind without abandoning what matters.',
  },
];

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

function scriptFor(theme) {
  return [
    `This is the Daily Karma. Today’s practice is ${theme.topic.toLowerCase()}: ${theme.title.toLowerCase()}. Find a supported position. Let your eyes close, or rest gently on the painting.`,
    'Feel the surface beneath you. Unclench your jaw. Let your shoulders settle. For these five minutes, there is nowhere else you need to be.',
    'Notice one breath arriving and one breath leaving. Do not improve it. Let each breath return you to the direct experience of this moment.',
    theme.principle,
    theme.image,
    'Notice what your body is doing with these words. Soften around the eyes, the hands, and the belly. Keep only the effort needed to stay present.',
    theme.inquiry,
    'For a little while, I will be quiet. Let thoughts pass like weather over a wide landscape. When attention wanders, return with patience.',
    'Still here. Still breathing. Nothing special needs to happen. This quiet awareness is already a useful way of meeting your life.',
    theme.action,
    'Feel the room around you. Move your fingers when you are ready. Let your eyes open gently. Thank you for practicing with Karma.',
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
  const theme = themeFor(date);
  const texts = scriptFor(theme);
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
