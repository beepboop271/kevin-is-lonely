import { Message, StreamDispatcher, VoiceConnection } from "discord.js";
import { Readable as ReadableStream } from "stream";

import { IQueue } from "./queue";

export abstract class ServerConfig<T> {
  public readonly voiceChannel: string;
  public readonly textChannel: string;

  private readonly _conn: VoiceConnection;
  private readonly _queue: IQueue<T>;

  private _dispatcher: StreamDispatcher | undefined;
  private _nextStream: Promise<ReadableStream> | undefined;

  public constructor(
    voiceChannelId: string,
    textChannelId: string,
    conn: VoiceConnection,
    queue: IQueue<T>
  ) {
    this.voiceChannel = voiceChannelId;
    this.textChannel = textChannelId;

    this._conn = conn;
    this._dispatcher = undefined;
    this._queue = queue;
    this._nextStream = undefined;
  }

  protected get conn(): VoiceConnection {
    return this._conn;
  }

  protected get queue(): IQueue<T> {
    return this._queue;
  }

  public abstract async handleMessage(msg: Message): Promise<boolean>;

  public async enqueue(content: T): Promise<void> {
    if (!this.isPlaying()) {
      this.playStream(await this.fetchStream(content));
    } else {
      if (this._nextStream === undefined) {
        this._nextStream = this.fetchStream(content);
      } else {
        this._queue.enqueue(content);
      }
    }
  }

  protected abstract async fetchStream(data: T): Promise<ReadableStream>;

  protected onEnd(): void {
    ;
  }

  protected die(): void {
    this._dispatcher?.removeAllListeners();
    this._dispatcher?.destroy();
    this._conn.disconnect();
  }

  protected async dequeue(): Promise<ReadableStream | undefined> {
    if (!this.available()) {
      return undefined;
    }
    const value: Promise<ReadableStream> = this._nextStream!;

    this._nextStream = this._queue.available()
      ? this.fetchStream(this._queue.dequeue()!)
      : undefined;

    return value;
  }

  protected available(): boolean {
    return this._nextStream !== undefined;
  }

  private playStream(content: ReadableStream): void {
    if (this.isPlaying()) {
      throw new Error("tried to play stream while already playing");
    }
    this._dispatcher = this._conn.play(content);
    this._dispatcher.on("end", (): void => {
      if (this._dispatcher === undefined) {
        // the literal only place dispatcher can become undefined
        // is inside this very function but whatever tslint
        return;
      }
      this.onEnd();
      this._dispatcher.removeAllListeners();
      this._dispatcher.destroy();
      if (this.available()) {
        this.dequeue()
          .then((stream: ReadableStream | undefined): void => {
            // not undefined because this.available was checked
            this._dispatcher = undefined;
            this.playStream(stream!);
          })
          .catch(console.error);
      } else {
        this._dispatcher = undefined;
      }
    });
  }

  private isPlaying(): boolean {
    return this._dispatcher !== undefined;
  }
}
