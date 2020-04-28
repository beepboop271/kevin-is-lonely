const clamp = (value: number, min: number, max: number): number =>
  Math.max(Math.min(value, max), min);

export class UserTtsConfig {
  private static readonly MAX_PITCH: number = 20;
  private static readonly MIN_SPEED: number = 0.25;
  private static readonly MAX_SPEED: number = 4;

  private _voice!: string;
  private _lang!: string;
  private _voiceOption!: string;
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
    this._voiceOption = "B";
    this._voice = "en-US-Wavenet-B";
    this._pitch = 0;
    this._speed = 1;
  }

  public setLang(lang: string): boolean {
    const match: RegExpMatchArray | null = lang
      .toLowerCase()
      .match(/(?<lang>[a-z]{2}|cmn)-(?<country>[a-z]{2})/);
    if (match === null || match.groups === undefined) {
      return false;
    }

    this._lang = `${match.groups.lang}-${match.groups.country.toUpperCase()}`;
    this._voice = `${this._lang}-Wavenet-${this._voiceOption}`;

    return true;
  }

  public setVoiceOption(voiceOption: string): boolean {
    if (voiceOption.match(/^[a-f]$/i) === null) {
      return false;
    }

    this._voiceOption = voiceOption.toUpperCase();
    this._voice = `${this._lang}-Wavenet-${this._voiceOption}`;

    return true;
  }

  public setPitch(pitch: number): boolean {
    if (Number.isNaN(pitch)) {
      return false;
    }

    this._pitch = clamp(pitch, -UserTtsConfig.MAX_PITCH, UserTtsConfig.MAX_PITCH);

    return true;
  }

  public setSpeed(speed: number): boolean {
    if (Number.isNaN(speed)) {
      return false;
    }

    this._speed = clamp(speed, UserTtsConfig.MIN_SPEED, UserTtsConfig.MAX_SPEED);

    return true;
  }
}
