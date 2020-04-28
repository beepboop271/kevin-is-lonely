import { VoiceConnection } from "discord.js";
import { Readable as ReadableStream } from "stream";
import ytdl from "ytdl-core";

import { ArrayQueue } from "./Queue";
import { ServerConfig } from "./ServerConfig";

export class ServerMusicConfig extends ServerConfig<string> {
  public constructor(conn: VoiceConnection) {
    super(conn, new ArrayQueue<string>());
  }

  protected async fetchStream(data: string): Promise<ReadableStream> {
    return Promise.resolve(ytdl(data, {quality: "highestaudio"}));
  }
}
