import { VoiceConnection } from "discord.js";

export default class TtsConfig {
  readonly channel: string;
  readonly speaker: string;
  readonly conn: VoiceConnection;

  // ! before : annotates that variables are in fact being
  // initialized even though it may not seem like it in
  // the constructor
  private _voice!: string;
  private _lang!: string;
  private _voiceOption!: string;
  private _pitch!: number;

  constructor (channel: string, speaker: string, conn: VoiceConnection) {
    this.channel = channel;
    this.speaker = speaker;
    this.conn = conn;
    this.reset();
  }

  reset(): void {
    this._lang = "en-US";
    this._voiceOption = "B";
    this._voice = "en-US-Wavenet-B";
    this._pitch = 0;
  }

  setLang(lang: string): boolean {
    lang = lang.toLowerCase();
    let match: RegExpMatchArray|null = lang.match(/([a-z]{2}|cmn)-([a-z]{2})/);
    if (!match) {
      return false;
    }

    this._lang = match[1]+"-"+match[2].toUpperCase();
    this._voice = this._lang+"-Wavenet-"+this._voiceOption;
    return true;
  }

  setVoiceOption(voiceOption: string): boolean {
    if (!voiceOption.match(/^[a-f]$/i)) {
      return false;
    }
    
    this._voiceOption = voiceOption.toUpperCase();
    this._voice = this._lang+"-Wavenet-"+this._voiceOption;
    return true;
  }

  setPitch(pitch: number): boolean {
    if (Number.isNaN(pitch)) {
      return false;
    }
    if (Math.abs(pitch) > 20) {
      pitch = Math.sign(pitch)*20;
    }
    this._pitch = pitch;
    return true;
  }

  get voice() {
    return this._voice;
  }

  get lang() {
    return this._lang;
  }

  get pitch() {
    return this._pitch;
  }
}
