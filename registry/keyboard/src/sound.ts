// Key clicks made with WebAudio as they play, from no sound files: a short
// burst of noise through a band filter for the click and a falling tone
// under it for the body. Each key sounds a little its own way, by a number
// worked out from its name, and a little different each time, by a touch of
// chance that only the sound uses.

/** Plays the clicks; `close` ends its audio. */
export type Clicks = { play: (id: string, width: number, down: boolean) => void; close: () => void };

/** A number from 0 to 1 for a key, always the same for the same key. */
function tone(id: string) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619);
  return (hash >>> 0) / 4294967296;
}

/** Starts the audio. Call it only in answer to a press, as browsers ask; null without WebAudio. */
export function clicks(): Clicks | null {
  if (typeof AudioContext === "undefined") return null;
  const audio = new AudioContext();
  const noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.06), audio.sampleRate);
  const samples = noise.getChannelData(0);
  for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
  const out = audio.createGain();
  out.gain.value = 0.5;
  out.connect(audio.destination);

  /** A gain that rises to `peak` at once and dies away over `length` seconds. */
  const envelope = (start: number, peak: number, length: number) => {
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    gain.connect(out);
    return gain;
  };

  return {
    play(id, width, down) {
      // Safari also leaves a context "interrupted", as after a call.
      if (audio.state !== "running" && audio.state !== "closed") void audio.resume().catch(() => {});
      const start = audio.currentTime + 0.002;
      // Wider keys sound deeper: space, return, shift and delete most.
      const deep = 1 / (1 + (width - 1) * 0.3);
      const own = 0.9 + tone(id) * 0.2;
      const chance = 1 + (Math.random() - 0.5) * 0.08;

      const click = audio.createBufferSource();
      click.buffer = noise;
      const band = audio.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = (down ? 3400 : 4600) * Math.sqrt(deep) * own * chance;
      band.Q.value = down ? 1.4 : 0.9;
      const clickGain = envelope(start, down ? 0.9 : 0.3, down ? 0.035 : 0.02);
      click.connect(band).connect(clickGain);
      // A finished sound lets go of its nodes, so they do not pile up on the context.
      click.onended = () => {
        click.disconnect();
        band.disconnect();
        clickGain.disconnect();
      };
      click.start(start);
      click.stop(start + 0.06);

      const body = audio.createOscillator();
      body.type = "triangle";
      const pitch = (down ? 190 : 300) * deep * own * chance;
      body.frequency.setValueAtTime(pitch * 1.8, start);
      body.frequency.exponentialRampToValueAtTime(pitch, start + 0.025);
      const bodyGain = envelope(start, down ? 0.45 : 0.12, down ? 0.07 + (1 - deep) * 0.05 : 0.035);
      body.connect(bodyGain);
      body.onended = () => {
        body.disconnect();
        bodyGain.disconnect();
      };
      body.start(start);
      body.stop(start + 0.14);
    },
    close: () => void audio.close().catch(() => {}),
  };
}
