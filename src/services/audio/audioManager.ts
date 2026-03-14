import { Howl } from 'howler';

type SoundId = 'die_roll' | 'card_draw' | 'card_play' | 'card_flip' | 'token_move' |
  'success_chime' | 'failure_thud' | 'level_up' | 'timer_tick' | 'timer_end' |
  'trigger_reveal' | 'phase_transition' | 'trade_complete' | 'button_click' | 'notification';

class AudioManager {
  private sounds: Map<SoundId, Howl> = new Map();
  private music: Howl | null = null;
  private sfxEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.3;

  constructor() {
    this.loadSounds();
  }

  private loadSounds(): void {
    const soundFiles: Record<SoundId, string> = {
      die_roll: '/audio/die_roll.mp3',
      card_draw: '/audio/card_draw.mp3',
      card_play: '/audio/card_play.mp3',
      card_flip: '/audio/card_flip.mp3',
      token_move: '/audio/token_move.mp3',
      success_chime: '/audio/success_chime.mp3',
      failure_thud: '/audio/failure_thud.mp3',
      level_up: '/audio/level_up.mp3',
      timer_tick: '/audio/timer_tick.mp3',
      timer_end: '/audio/timer_end.mp3',
      trigger_reveal: '/audio/trigger_reveal.mp3',
      phase_transition: '/audio/phase_transition.mp3',
      trade_complete: '/audio/trade_complete.mp3',
      button_click: '/audio/button_click.mp3',
      notification: '/audio/notification.mp3',
    };

    for (const [id, src] of Object.entries(soundFiles)) {
      this.sounds.set(id as SoundId, new Howl({
        src: [src],
        volume: this.sfxVolume,
        preload: false, // lazy load - only load when first played
      }));
    }
  }

  play(soundId: SoundId): void {
    if (!this.sfxEnabled) return;
    const sound = this.sounds.get(soundId);
    if (sound) {
      if (sound.state() === 'unloaded') sound.load();
      sound.play();
    }
  }

  playMusic(theme: 'setup' | 'deliberation' | 'action' | 'scoring'): void {
    if (!this.musicEnabled) return;
    if (this.music) this.music.stop();
    this.music = new Howl({
      src: [`/audio/music_${theme}.mp3`],
      volume: this.musicVolume,
      loop: true,
    });
    this.music.play();
  }

  stopMusic(): void {
    if (this.music) {
      this.music.stop();
      this.music = null;
    }
  }

  toggleSFX(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }

  toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) this.stopMusic();
    return this.musicEnabled;
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => sound.volume(this.sfxVolume));
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.music) this.music.volume(this.musicVolume);
  }

  isSFXEnabled(): boolean { return this.sfxEnabled; }
  isMusicEnabled(): boolean { return this.musicEnabled; }
}

export const audioManager = new AudioManager();
