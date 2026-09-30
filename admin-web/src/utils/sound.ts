// Web Audio API Synthesizer for Store Order Alert Alarms & Chimes
// Zero external audio files, works instantly in any browser.

let sharedCtx: AudioContext | null = null;
let alarmIntervalId: any = null;
let autoShutoffTimeoutId: any = null;
let isAlarmActive = false;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new AudioCtx();
    }
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(() => {});
    }
    return sharedCtx;
  } catch (e) {
    console.warn('AudioContext initialization notice:', e);
    return null;
  }
}

// Ensure audio context is ready on user gesture
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (sharedCtx && sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

/**
 * Plays one round of energetic restaurant merchant alert chimes
 * Sequence: C5 -> E5 -> G5 -> C6 high doorbell fanfare
 */
export function playNewOrderChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const notes = [
      { freq: 523.25, time: now + 0.00, duration: 0.35, gain: 0.30 }, // C5
      { freq: 659.25, time: now + 0.15, duration: 0.35, gain: 0.35 }, // E5
      { freq: 783.99, time: now + 0.30, duration: 0.40, gain: 0.40 }, // G5
      { freq: 1046.50, time: now + 0.48, duration: 0.90, gain: 0.45 }, // C6
      // Second flourish
      { freq: 783.99, time: now + 0.95, duration: 0.30, gain: 0.25 }, // G5
      { freq: 1046.50, time: now + 1.15, duration: 1.10, gain: 0.45 }, // C6
    ];

    notes.forEach(({ freq, time, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Sine wave with subtle harmonic warmth
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gainNode.gain.setValueAtTime(0.001, time);
      gainNode.gain.exponentialRampToValueAtTime(gain, time + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration);
    });
  } catch (err) {
    console.warn('Audio chime warning:', err);
  }
}

/**
 * Starts continuous repeating order alarm loop until stopped
 * Loops every 2.8 seconds. Auto-terminates after 3 minutes if unattended.
 */
export function startOrderAlarmLoop() {
  if (isAlarmActive) return;
  isAlarmActive = true;

  // Play first chime immediately
  playNewOrderChime();

  // Repeat every 2.8 seconds
  if (alarmIntervalId) clearInterval(alarmIntervalId);
  alarmIntervalId = setInterval(() => {
    if (!isAlarmActive) {
      clearInterval(alarmIntervalId);
      alarmIntervalId = null;
      return;
    }
    playNewOrderChime();
  }, 2800);

  // Safety shutoff after 3 minutes to avoid overnight looping
  if (autoShutoffTimeoutId) clearTimeout(autoShutoffTimeoutId);
  autoShutoffTimeoutId = setTimeout(() => {
    stopOrderAlarmLoop();
  }, 180000);
}

/**
 * Stops the repeating alarm loop immediately
 */
export function stopOrderAlarmLoop() {
  isAlarmActive = false;
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  if (autoShutoffTimeoutId) {
    clearTimeout(autoShutoffTimeoutId);
    autoShutoffTimeoutId = null;
  }
}

/**
 * Returns whether the alarm is currently ringing
 */
export function isOrderAlarmPlaying(): boolean {
  return isAlarmActive;
}
