import { Message, StreamDispatcher, VoiceConnection } from "discord.js";
import NestedError from "nested-error-stacks";
import { Readable as ReadableStream } from "stream";

import { IQueue } from "./queue";

export abstract class ServerConfig<T> {
  public readonly voiceChannel: string;
  public readonly textChannel: string;

  private readonly _conn: VoiceConnection;
  private readonly _queue: IQueue<T>;

  private _dispatcher: StreamDispatcher | undefined;
  private _nextStream: Promise<ReadableStream> | undefined;
  private _isLoadingStream: boolean;

  public constructor(
    voiceChannelId: string,
    textChannelId: string,
    conn: VoiceConnection,
    queue: IQueue<T>,
  ) {
    this.voiceChannel = voiceChannelId;
    this.textChannel = textChannelId;

    this._conn = conn;
    this._dispatcher = undefined;
    this._queue = queue;
    this._nextStream = undefined;

    this._isLoadingStream = false;
  }

  protected get conn(): VoiceConnection {
    return this._conn;
  }

  protected get queue(): IQueue<T> {
    return this._queue;
  }

  public abstract async handleMessage(msg: Message): Promise<boolean>;

  public async enqueue(content: T): Promise<void> {
    if (
      !this.isPlaying()
      && this._nextStream === undefined
      && !this._queue.available()
    ) {
      // to prevent two messages from being loaded and then both
      // attempting to playStream (thus causing error), set a flag
      this._isLoadingStream = true;
      try {
        const stream = await this.fetchStream(content);
        this._isLoadingStream = false;
        this.playStream(stream);
      } catch (e) {
        this._isLoadingStream = false;
        if (e instanceof Error) {
          throw new NestedError("Failed to load stream to play", e);
        }
        throw new Error(`Failed to load stream to play: ${e}`);
      }
    } else {
      if (this._nextStream === undefined) {
        this._nextStream = this.fetchStream(content);
      } else {
        this._queue.enqueue(content);
      }
    }
  }

  protected abstract async fetchStream(data: T): Promise<ReadableStream>;

  // tslint:disable-next-line:no-empty
  protected onEnd(): void {
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

    try {
      this._nextStream = this._queue.available()
        ? this.fetchStream(this._queue.dequeue()!)
        : undefined;
    } catch (e) {
      if (e instanceof Error) {
        throw new NestedError("Failed to load an upcoming stream", e);
      }
      throw new Error(`Failed to load an upcoming stream: ${e}`);
    }

    return value;
  }

  protected available(): boolean {
    return this._nextStream !== undefined;
  }

  private playStream(content: ReadableStream): void {
    if (this.isPlaying()) {
      throw new Error("tried to play stream while already playing");
    }
    this._dispatcher = this._conn.play(content, { volume: false });
    this._dispatcher.on("finish", (): void => {
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
          .catch((e): void => {
            if (e instanceof Error) {
              throw new NestedError("Failed to get the next stream to play", e);
            }
            throw new Error(`Failed to get the next stream to play: ${e}`);
          });
      } else {
        this._dispatcher = undefined;
      }
    });
  }

  private isPlaying(): boolean {
    return this._isLoadingStream || this._dispatcher !== undefined;
  }
}
