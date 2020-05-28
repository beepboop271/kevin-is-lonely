import { Message, VoiceConnection } from "discord.js";
import NestedError from "nested-error-stacks";
import { Readable as ReadableStream } from "stream";
import ytdl from "ytdl-core";

import { ArrayQueue } from "./queue";
import { ServerConfig } from "./serverConfig";

export class ServerMusicConfig extends ServerConfig<string> {
  private _nowPlaying: string | undefined;
  private _nextUp: string | undefined;

  public constructor(
    voiceChannelId: string,
    textChannelId: string,
    conn: VoiceConnection,
  ) {
    super(
      voiceChannelId,
      textChannelId,
      conn,
      new ArrayQueue<string>(),
    );
  }

  public async handleMessage(msg: Message, args: readonly string[]): Promise<boolean> {
    if (msg.content.charAt(0) === "*") {
      try {
        switch (args[0]) {
          case "help":
            await msg.reply("`*leave`, `*play (link)`, `*queue`");
            break;
          case "leave":
            this.die();

            return true;
          case "play":
            if (args.length > 1) {
              await this.enqueue(args[1]);
              await msg.reply("added");
            } else {
              await msg.reply("expected a youtube link");
            }
            break;
          case "queue":
            let s = `Now playing: <${this._nowPlaying}>\nNext up: <${this._nextUp}>\nQueue:\n`;
            for (const url of this.queue) {
              s += `<${url}>\n`;
            }
            await msg.channel.send(s);
        }
      } catch (e) {
        if (e instanceof Error) {
          throw new NestedError("I'm lazy and put a try/catch around a large section", e);
        }
        throw new Error(`I'm lazy and put a try/catch around a large section: ${e}`);
      }
    }

    return false;
  }

  public async enqueue(content: string): Promise<void> {
    await super.enqueue(content);
    if (this._nowPlaying === undefined) {
      this._nowPlaying = content;
    } else if (this._nextUp === undefined) {
      this._nextUp = content;
    }
  }

  protected onEnd(): void {
    this._nowPlaying = this._nextUp;
    this._nextUp = this.queue.peek();
  }

  protected async fetchStream(data: string): Promise<ReadableStream> {
    return Promise.resolve(ytdl(data, {quality: "highestaudio"}));
  }
}
