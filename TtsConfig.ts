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
    if (lang.length != 5) {
      return false;
    }
    if (!lang.match(/^[a-z][a-z]-[A-Z][A-Z]$/)) {
      return false;
    }
    this._lang = lang;
    this._voice = this._lang+"-Wavenet-"+this._voiceOption;
    return true;
  }

  setVoiceOption(voiceOption: string): boolean {
    if (voiceOption.length > 1) {
      return false;
    }
    voiceOption = voiceOption.toUpperCase();
    if ((voiceOption.charCodeAt(0) < 65) || (voiceOption.charCodeAt(0) > 70)) {
      return false;
    }
    this._voiceOption = voiceOption;
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
