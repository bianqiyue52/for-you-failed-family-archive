import { ASSET_CONFIG } from "./config.js";

const SOUND_VOLUME = {
  phone: 0.15,
  dryClick: 0.18,
  tent: 0.14,
  register: 0.15,
  gardenia: 0.08,
  watering: 0.12,
  soil: 0.13,
  blackout: 0.34,
  archiveReject: 0.13,
  roomTone: 0.09
};

const RANDOM_SEGMENT_CONFIG = {
  phone: { minDuration: 3, maxDuration: 5, volume: SOUND_VOLUME.phone, fadeIn: 0.18, fadeOut: 0.55, maxInstances: 1 },
  register: { minDuration: 4, maxDuration: 7, volume: SOUND_VOLUME.register, fadeIn: 0.25, fadeOut: 0.75, maxInstances: 2 },
  tent: { minDuration: 4, maxDuration: 7, volume: SOUND_VOLUME.tent, fadeIn: 0.25, fadeOut: 0.85, maxInstances: 2 },
  gardenia: { minDuration: 5, maxDuration: 10, volume: SOUND_VOLUME.gardenia, fadeIn: 0.55, fadeOut: 1.2, maxInstances: 3 },
  soil: { minDuration: 4, maxDuration: 8, volume: SOUND_VOLUME.soil, fadeIn: 0.2, fadeOut: 1, maxInstances: 3 }
};

export function createAudioSystem(state) {
  const activeLoops = new Map();
  const activeSegments = new Map();
  let roomTone = null;
  let lastArchiveRejectAt = 0;

  function ensureAudio() {
    if (!state.audioContext) {
      state.audioContext = new AudioContext();
    }
    if (state.audioContext.state === "suspended") {
      state.audioContext.resume();
    }
  }

  function playMemorySound(key) {
    ensureAudio();
    startRoomTone();

    if (key === "phone") {
      playPhoneSequence();
      return;
    }

    if (key === "watering") {
      startLoop("watering", { volume: SOUND_VOLUME.watering, fallbackKey: "watering" });
      return;
    }

    if (RANDOM_SEGMENT_CONFIG[key]) {
      playRandomSegment(key, RANDOM_SEGMENT_CONFIG[key]);
      return;
    }

    playFile(key, { volume: SOUND_VOLUME[key], fallbackKey: key });
  }

  function playPhoneSequence(onDryClick) {
    ensureAudio();
    startRoomTone();
    const segment = playRandomSegment("phone", {
      ...RANDOM_SEGMENT_CONFIG.phone,
      allowOverlap: false,
      group: "phone"
    });

    window.setTimeout(() => {
      playDryClick();
      onDryClick?.();
    }, segment.durationMs);
  }

  function playRandomSegment(key, options = {}) {
    const {
      minDuration = 3,
      maxDuration = minDuration,
      volume = SOUND_VOLUME[key] ?? 0.16,
      fadeIn = 0.15,
      fadeOut = 0.5,
      maxInstances = 2,
      allowOverlap = true,
      group = key,
      fallbackKey = key
    } = options;
    const duration = randomBetween(minDuration, maxDuration);
    const audio = createAudio(key, { volume: 0, loop: false });

    if (!audio) {
      playFallbackSound(fallbackKey);
      return { audio: null, durationMs: duration * 1000 };
    }

    const instance = {
      audio,
      baseVolume: volume,
      cleanupTimer: 0,
      duckMultiplier: 1,
      group
    };
    registerSegment(group, instance, { maxInstances, allowOverlap });

    const startPlayback = () => {
      const availableDuration = Number.isFinite(audio.duration) ? audio.duration : duration;
      const maxStart = Math.max(0, availableDuration - duration - 0.1);
      audio.currentTime = maxStart > 0 ? randomBetween(0, maxStart) : 0;
      audio.play().catch(() => {
        unregisterSegment(instance);
        playFallbackSound(fallbackKey);
      });
      fadeToVolume(instance, volume, fadeIn * 1000);
      instance.cleanupTimer = window.setTimeout(() => {
        fadeOutSegment(instance, fadeOut * 1000);
      }, Math.max(0, (duration - fadeOut) * 1000));
    };

    if (audio.readyState >= 1) {
      startPlayback();
    } else {
      audio.addEventListener("loadedmetadata", startPlayback, { once: true });
      audio.addEventListener("error", () => {
        unregisterSegment(instance);
        playFallbackSound(fallbackKey);
      }, { once: true });
      audio.load();
    }

    return { audio, durationMs: duration * 1000 };
  }

  function registerSegment(group, instance, { maxInstances, allowOverlap }) {
    const instances = activeSegments.get(group) ?? [];
    activeSegments.set(group, instances);

    if (!allowOverlap) {
      instances.splice(0).forEach((oldInstance) => fadeOutSegment(oldInstance, 220));
    }

    instances.push(instance);
    while (instances.length > maxInstances) {
      const oldInstance = instances.shift();
      if (oldInstance) fadeOutSegment(oldInstance, 320);
    }
  }

  function unregisterSegment(instance) {
    window.clearTimeout(instance.cleanupTimer);
    const instances = activeSegments.get(instance.group);
    if (instances) {
      const index = instances.indexOf(instance);
      if (index >= 0) instances.splice(index, 1);
      if (instances.length === 0) activeSegments.delete(instance.group);
    }
  }

  function startRoomTone() {
    if (roomTone) return;

    roomTone = createAudio("roomTone", { volume: SOUND_VOLUME.roomTone, loop: true });
    if (!roomTone) return;

    roomTone.play().catch(() => {
      roomTone = null;
    });
  }

  function startLoop(key, { id = key, volume = SOUND_VOLUME[key] ?? 0.12, fallbackKey = key } = {}) {
    stopLoop(id, { fadeMs: 120 });
    const audio = createAudio(key, { volume, loop: true });
    if (!audio) {
      playFallbackSound(fallbackKey);
      return null;
    }

    activeLoops.set(id, audio);
    audio.play().catch(() => {
      activeLoops.delete(id);
      playFallbackSound(fallbackKey);
    });
    return audio;
  }

  function stopLoop(id, { fadeMs = 220 } = {}) {
    const audio = activeLoops.get(id);
    if (!audio) return;
    activeLoops.delete(id);
    fadeOutAudio(audio, fadeMs);
  }

  function playArchiveReject({ force = false } = {}) {
    const now = performance.now();
    if (!force && now - lastArchiveRejectAt < 1900) return;
    lastArchiveRejectAt = now;
    playFile("archiveReject", { volume: SOUND_VOLUME.archiveReject, fallbackKey: "archiveReject" });
  }

  function playDryClick() {
    duckActiveSegments(1000, 0.42);
    playFile("dryClick", { volume: SOUND_VOLUME.dryClick, fallbackKey: "dryClick" });
  }

  function playFile(key, { volume = 0.18, loop = false, fallbackKey = key } = {}) {
    const audio = createAudio(key, { volume, loop });
    if (!audio) {
      playFallbackSound(fallbackKey);
      return null;
    }

    audio.play().catch(() => playFallbackSound(fallbackKey));
    return audio;
  }

  function createAudio(key, { volume, loop }) {
    const path = ASSET_CONFIG.audio[key];
    if (!path) return null;

    const audio = new Audio(path);
    audio.volume = volume;
    audio.loop = loop;
    audio.preload = "auto";
    return audio;
  }

  function fadeToVolume(instance, targetVolume, durationMs) {
    const startVolume = instance.audio.volume;
    const startedAt = performance.now();

    function tick(now) {
      if (instance.audio.paused) return;
      const progress = Math.min(1, (now - startedAt) / durationMs);
      instance.audio.volume = lerp(startVolume, targetVolume * instance.duckMultiplier, progress);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function fadeOutSegment(instance, durationMs) {
    unregisterSegment(instance);
    fadeOutAudio(instance.audio, durationMs);
  }

  function fadeOutAudio(audio, durationMs) {
    const startVolume = audio.volume;
    const startedAt = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      audio.volume = startVolume * (1 - progress);
      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }
      audio.pause();
      audio.currentTime = 0;
      audio.volume = startVolume;
    }

    requestAnimationFrame(tick);
  }

  function duckActiveSegments(durationMs, multiplier) {
    const instances = [...activeSegments.values()].flat();
    instances.forEach((instance) => {
      instance.duckMultiplier = multiplier;
      instance.audio.volume = Math.min(instance.audio.volume, instance.baseVolume * multiplier);
    });

    window.setTimeout(() => {
      instances.forEach((instance) => {
        if (instance.audio.paused) return;
        instance.duckMultiplier = 1;
        fadeToVolume(instance, instance.baseVolume, 320);
      });
    }, durationMs);
  }

  function playFallbackSound(key) {
    const tones = {
      phone: [155, 0.12, "square"],
      dryClick: [310, 0.07, "square"],
      tent: [240, 0.1, "triangle"],
      register: [110, 0.08, "sawtooth"],
      gardenia: [520, 0.18, "sine"],
      watering: [330, 0.16, "triangle"],
      soil: [85, 0.14, "sine"],
      blackout: [45, 0.8, "sine"],
      archiveReject: [185, 0.1, "sawtooth"]
    };
    const [frequency, duration, type] = tones[key] ?? [220, 0.1, "sine"];
    playTone(frequency, duration, type, key === "blackout" ? 0.12 : 0.06);
  }

  function playTone(frequency, duration, type, volume) {
    ensureAudio();
    const oscillator = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gain.gain.setValueAtTime(volume, state.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(state.audioContext.destination);
    oscillator.start();
    oscillator.stop(state.audioContext.currentTime + duration);
  }

  return {
    ensureAudio,
    playArchiveReject,
    playMemorySound,
    playPhoneSequence,
    playRandomSegment,
    playTone,
    stopLoop
  };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}
