// Writes the original sound effects in public/sounds. The output is committed;
// run this only to change a sound: node scripts/generate-sounds.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const RATE = 22050;

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, i) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    data.writeInt16LE(Math.round(clipped * 32767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function render(seconds, sampleAt) {
  return Array.from({ length: Math.floor(seconds * RATE) }, (_, i) =>
    sampleAt(i / RATE),
  );
}

/** A decaying sine wave. */
const bell = (t, frequency, decay) =>
  Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * decay);

/** Liquid: softened noise that swells and fades. Seeded, so output is stable. */
function pour() {
  let seed = 12345;
  let smooth = 0;
  return render(0.8, (t) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    smooth += (seed / 1073741824 - 1 - smooth) * 0.18;
    const envelope = Math.min(t / 0.08, 1) * Math.min((0.8 - t) / 0.25, 1);
    return smooth * envelope * 0.8;
  });
}

const clink = () =>
  render(0.25, (t) => (bell(t, 2637, 26) + bell(t, 3951, 34)) * 0.35);

const ding = () =>
  render(0.7, (t) => (bell(t, 880, 6) + bell(t, 1760, 9) * 0.4) * 0.45);

mkdirSync("public/sounds", { recursive: true });
for (const [name, samples] of Object.entries({
  pour: pour(),
  clink: clink(),
  ding: ding(),
})) {
  writeFileSync(`public/sounds/${name}.wav`, wav(samples));
}
