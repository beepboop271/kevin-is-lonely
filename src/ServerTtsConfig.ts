import { PassThrough as PassThroughStream } from "stream";
import { VoiceConnection, StreamDispatcher } from "discord.js";
import UserTtsConfig from "./UserTtsConfig";
import CircularQueue from "./CircularQueue";

export default class ServerTtsConfig {
  readonly voiceChannel: string;
  readonly textChannel: string;
  private readonly _conn: VoiceConnection;

  private _users: Map<String, UserTtsConfig>;
  private _dispatcher: StreamDispatcher|null;
  private _streamQueue: CircularQueue<PassThroughStream>;

  constructor(voiceChannel: string, textChannel: string, conn: VoiceConnection) {
    this.voiceChannel = voiceChannel;
    this.textChannel = textChannel;
    this._conn = conn;
    this._users = new Map<String, UserTtsConfig>();
    this._dispatcher = null;
    this._streamQueue = new CircularQueue(10);
  }

  playMessage(messageAudio: PassThroughStream): void {
    // need to see if this method will
    // cause stack overflow or leak memory
    if (!this._dispatcher) {
      this._dispatcher = this._conn.play(messageAudio);
      this._dispatcher.on("end", () => {
        this._dispatcher!.removeAllListeners();
        this._dispatcher!.destroy();
        this._dispatcher = null;
        if (this._streamQueue.available()) {
          this.playMessage(this._streamQueue.dequeue());
        }
      });
    } else {
      this._streamQueue.enqueue(messageAudio);
    }
  }

  getUserConfig(userId: string): UserTtsConfig|undefined {
    return this._users.get(userId);
  }

  addUser(userId: string): void {
    this._users.set(userId, new UserTtsConfig());
  }

  deleteUser(userId: string): boolean {
    this._users.delete(userId);
    if (this._users.size == 0) {
      this._conn.disconnect();
      return true;
    }
    return false;
  }

  getNumUsers(): number {
    return this._users.size;
  }
}
