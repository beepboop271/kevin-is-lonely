export default class UserTtsConfig {
  // ! before : annotates that variables are in fact being
  // initialized even though it may not seem like it in
  // the constructor
  private _voice!: string;
  private _lang!: string;
  private _voiceOption!: string;
  private _pitch!: number;
  private _speed!: number;

  constructor() {
    this.reset();
  }

  reset(): void {
    this._lang = "en-US";
    this._voiceOption = "B";
    this._voice = "en-US-Wavenet-B";
    this._pitch = 0;
    this._speed = 1;
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

  setSpeed(speed: number): boolean {
    if (Number.isNaN(speed)) {
      return false;
    }
    if (speed < 0.25) {
      this._speed = 0.25;
    } else if (speed > 4) {
      this._speed = 4;
    } else {
      this._speed = speed;
    }
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

  get speed() {
    return this._speed;
  }
}
