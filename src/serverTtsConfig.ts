import { Message, VoiceConnection } from "discord.js";
import NestedError from "nested-error-stacks";
import { PassThrough as PassThroughStream } from "stream";

import { embeds, ttsClient } from "./bot";
import { CircularQueue } from "./queue";
import { ServerConfig } from "./serverConfig";
import { UserTtsConfig } from "./userTtsConfig";

interface ITtsRequest {
  text: string;
  config: UserTtsConfig;
}

export class ServerTtsConfig extends ServerConfig<ITtsRequest> {
  private static readonly QUEUE_LENGTH = 10;

  private readonly _users: Map<string, UserTtsConfig>;

  public constructor(
    voiceChannelId: string,
    textChannelId: string,
    conn: VoiceConnection,
  ) {
    super(
      voiceChannelId,
      textChannelId,
      conn,
      new CircularQueue<ITtsRequest>(ServerTtsConfig.QUEUE_LENGTH),
    );

    this._users = new Map<string, UserTtsConfig>();
  }

  public async handleMessage(msg: Message, args: readonly string[]): Promise<boolean> {
    const userConfig: UserTtsConfig | undefined = this._users.get(msg.author.id);
    if (userConfig === undefined) {
      return false;
    }
    // if in speaking mode
    if (msg.content.charAt(0) === "*") {
      try {
        switch (args[0]) {
          case "help":
            await msg.channel.send(embeds.voiceHelp);
            break;
          case "list":
            if (args[1] === "current") {
              await msg.channel.send(embeds.voiceList.get(userConfig.lang.split("-")[0]));
            }
            break;
          case "disconnect":
            this.die();

            return true;
          case "fuckoff":
            this.die();

            return true;
          case "leave":
            return this.deleteUser(msg.author.id);
          case "set-voice":
            try {
              userConfig.setVoice(args[1], args[2]);
            } catch (e) {
              if (e instanceof Error) {
                await msg.reply(e.message);
              } else {
                await msg.reply(e);
              }
            }
            break;
          case "set-pitch":
            try {
              userConfig.setPitch(Number(args[1]));
            } catch (e) {
              if (e instanceof Error) {
                await msg.reply(e.message);
              } else {
                await msg.reply(e);
              }
            }
            break;
          case "set-speed":
            try {
              userConfig.setSpeed(Number(args[1]));
            } catch (e) {
              if (e instanceof Error) {
                await msg.reply(e.message);
              } else {
                await msg.reply(e);
              }
            }
            break;
          case "reset-voice":
            userConfig.reset();
        }
      } catch (e) {
        if (e instanceof Error) {
          throw new NestedError("Failed to send reply", e);
        }
        throw new Error(`Failed to send reply: ${e}`);
      }
    } else {
      // speak all non-command messages
      // technically all messages that don't begin with '*'
      try {
        await this.enqueue({ text: msg.content, config: userConfig });
      } catch (e) {
        msg.channel.send(`failed to send: ${e} (most likely you mistyped a voice)`).catch((e): void => { throw e; });
        if (e instanceof Error) {
          throw new NestedError("Failed to enqueue message", e);
        }
        throw new Error(`Failed to enqueue message: ${e}`);
      }
    }

    return false;
  }

  public getUserConfig(userId: string): UserTtsConfig | undefined {
    return this._users.get(userId);
  }

  public addUser(userId: string): ServerTtsConfig {
    this._users.set(userId, new UserTtsConfig());

    return this;
  }

  public deleteUser(userId: string): boolean {
    this._users.delete(userId);
    if (this._users.size === 0) {
      this.die();

      return true;
    }

    return false;
  }

  protected async fetchStream(data: ITtsRequest): Promise<PassThroughStream> {
    // gets the mp3 audio of the requested text
    // using the configuration's language and voice
    try {
      const [response] = await ttsClient.synthesizeSpeech({
        input: { text: data.text },
        voice: { languageCode: data.config.lang, name: data.config.voice },
        audioConfig: {
          audioEncoding: "MP3",
          pitch: data.config.pitch,
          speakingRate: data.config.speed,
        },
      });

      if (
        response.audioContent !== null
        && response.audioContent !== undefined
        && response.audioContent instanceof Uint8Array
      ) {
        // create a stream for discord voice and convert
        // gcloud response (ArrayBuffer) -convert-> Buffer -write-to-> stream
        const audioStream: PassThroughStream = new PassThroughStream({
          highWaterMark: 65536,
        });
        audioStream.end(Buffer.from(response.audioContent.buffer));

        return audioStream;
      }
      throw new Error("error with speech synthesis response");
    } catch (e) {
      // gcloud tts might fail if someone sets voice/lang
      // wrong or smth dumb like that lol
      data.config.reset();
      // console.warn("reset voice to default");
      if (e instanceof Error) {
        throw new NestedError("Failed to synthesize speech", e);
      }
      throw e;
    }
  }
}
