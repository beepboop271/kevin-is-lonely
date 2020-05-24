// tslint:disable-next-line:no-submodule-imports // google dumb and puts the type in a random dir
import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";
import { Message, VoiceConnection } from "discord.js";
import NestedError from "nested-error-stacks";
import { PassThrough as PassThroughStream } from "stream";

import { CircularQueue } from "./queue";
import { ServerConfig } from "./serverConfig";
import { UserTtsConfig } from "./userTtsConfig";

interface ITtsRequest {
  text: string;
  config: UserTtsConfig;
}

export class ServerTtsConfig extends ServerConfig<ITtsRequest> {
  private static readonly QUEUE_LENGTH = 10;

  private readonly _ttsClient: TextToSpeechClient;
  private readonly _users: Map<string, UserTtsConfig>;

  public constructor(
    voiceChannelId: string,
    textChannelId: string,
    conn: VoiceConnection,
    tts: TextToSpeechClient,
  ) {
    super(
      voiceChannelId,
      textChannelId,
      conn,
      new CircularQueue<ITtsRequest>(ServerTtsConfig.QUEUE_LENGTH),
    );

    this._users = new Map<string, UserTtsConfig>();
    this._ttsClient = tts;
  }

  public async handleMessage(msg: Message): Promise<boolean> {
    const userConfig: UserTtsConfig | undefined = this._users.get(msg.author.id);
    if (userConfig === undefined) {
      return false;
    }
    // if in speaking mode
    if (msg.content.substring(0, 1) === "*") {
      const args: readonly string[] = msg.content.substring(1).split(" ");
      try {
        switch (args[0]) {
          case "help":
            await msg.reply("`*leave` to be lonely again, `*set-voice voice [lang]` to change voice (`*set-voice B en-us`)");
            break;
          case "leave":
            return this.deleteUser(msg.author.id);
          case "set-voice":
            // not the best error checking but better than nothing
            if (args.length > 2) {
              if (!userConfig.setLang(args[2])) {
                await msg.reply("invalid lang (expected something like en-US)");
              }
            }
            if (!userConfig.setVoiceOption(args[1])) {
              await msg.reply("invalid voice (expected one character a to f)");
            }
            break;
          case "set-pitch":
            if (!userConfig.setPitch(Number(args[1]))) {
              await msg.reply("invalid pitch (expected a number -20.0 to 20.0)");
            }
            break;
          case "set-speed":
            if (!userConfig.setSpeed(Number(args[1]))) {
              await msg.reply("invalid speed (expeceted a number 0.25 to 4)");
            }
            break;
          case "reset-voice":
            userConfig.reset();
            break;
          default:
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
      const [response] = await this._ttsClient.synthesizeSpeech({
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
      throw e;
    }
  }
}