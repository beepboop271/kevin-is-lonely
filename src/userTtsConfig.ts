import { voiceOptions } from "./bot";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(Math.min(value, max), min);

export class UserTtsConfig {
  private static readonly MAX_PITCH: number = 20;
  private static readonly MIN_SPEED: number = 0.25;
  private static readonly MAX_SPEED: number = 4;

  private _voice!: string;
  private _lang!: string;
  private _pitch!: number;
  private _speed!: number;

  public constructor() {
    this.reset();
  }

  public get voice(): string {
    return this._voice;
  }

  public get lang(): string {
    return this._lang;
  }

  public get pitch(): number {
    return this._pitch;
  }

  public get speed(): number {
    return this._speed;
  }

  public reset(): void {
    this._lang = "en-US";
    this._voice = "en-US-Wavenet-B";
    this._pitch = 0;
    this._speed = 1;
  }

  public setVoice(voiceVariant: string | undefined, lang: string | undefined): void {
    if (voiceVariant !== undefined) {
      let possibleLang = this._lang;
      const possibleVoiceVariant = voiceVariant.toUpperCase();

      if (lang !== undefined) {
        if (!voiceOptions.languageVariants.has(lang)) {
          throw new Error("Expected a language code supported, like `en-us` (`*set-voice a en-us`) (see `*list` or `*list current`)");
        }

        const parts = lang.split("-");
        possibleLang = `${parts[0]}-${parts[1].toUpperCase()}`;
      }

      const possibleVoice = `${possibleLang}-Wavenet-${possibleVoiceVariant}`;
      if (!voiceOptions.voiceVariants.has(possibleVoice)) {
        throw new Error("Expected a single letter supported by the language specified, like `a` (`*set-voice a` or `*set-voice a en-us`) (see `*list` or `*list current`)");
      }
      this._lang = possibleLang;
      this._voice = possibleVoice;
    } else {
      throw new Error("Expected a single letter supported by the language specified, like `a` (`*set-voice a` or `*set-voice a en-us`) (see `*list` or `*list current`)");
    }
  }

  public setPitch(pitch: number): void {
    if (Number.isNaN(pitch)) {
      throw new Error("Expected a number between -20 and 20 for pitch adjustment");
    }
    this._pitch = clamp(pitch, -UserTtsConfig.MAX_PITCH, UserTtsConfig.MAX_PITCH);
  }

  public setSpeed(speed: number): void {
    if (Number.isNaN(speed)) {
      throw new Error("Expected a number between 0.25 and 4 for speed adjustment");
    }
    this._speed = clamp(speed, UserTtsConfig.MIN_SPEED, UserTtsConfig.MAX_SPEED);
  }
}
