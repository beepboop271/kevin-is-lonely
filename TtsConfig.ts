import { VoiceConnection } from "discord.js";

export default class TtsConfig {
  readonly channel: string;
  readonly speaker: string;
  readonly conn: VoiceConnection;
  private _voice: string;
  private _lang: string;
  private _voiceOption: string;
  constructor (channel: string, speaker: string, conn: VoiceConnection) {
    this.channel = channel;
    this.speaker = speaker;
    this.conn = conn;
    this._lang = "en-US";
    this._voiceOption = "B";
    this._voice = "en-US-Wavenet-B";
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

  get voice() {
    return this._voice;
  }

  get lang() {
    return this._lang;
  }
}
