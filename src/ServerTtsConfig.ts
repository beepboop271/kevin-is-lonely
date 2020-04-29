// tslint:disable-next-line:no-submodule-imports // google dumb and puts the type in a random dir
import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";
import { VoiceConnection } from "discord.js";
import { PassThrough as PassThroughStream } from "stream";

import { CircularQueue } from "./Queue";
import { ServerConfig } from "./ServerConfig";
import { UserTtsConfig } from "./UserTtsConfig";

interface ITtsRequest {
  text: string;
  config: UserTtsConfig;
}

export class ServerTtsConfig extends ServerConfig<ITtsRequest> {
  private static readonly QUEUE_LENGTH = 10;

  public readonly voiceChannel: string;
  public readonly textChannel: string;

  private readonly _ttsClient: TextToSpeechClient;
  private readonly _users: Map<string, UserTtsConfig>;

  public constructor(
    voiceChannel: string,
    textChannel: string,
    conn: VoiceConnection,
    tts: TextToSpeechClient
  ) {
    super(conn, new CircularQueue<ITtsRequest>(ServerTtsConfig.QUEUE_LENGTH));

    this.voiceChannel = voiceChannel;
    this.textChannel = textChannel;
    this._users = new Map<string, UserTtsConfig>();
    this._ttsClient = tts;
  }

  public getUserConfig(userId: string): UserTtsConfig | undefined {
    return this._users.get(userId);
  }

  public addUser(userId: string): void {
    this._users.set(userId, new UserTtsConfig());
  }

  public deleteUser(userId: string): boolean {
    this._users.delete(userId);
    if (this._users.size === 0) {
      this.conn.disconnect();

      return true;
    }

    return false;
  }

  public getNumUsers(): number {
    return this._users.size;
  }

  protected async fetchStream(data: ITtsRequest): Promise<PassThroughStream> {
    // gets the mp3 audio of the requested text
    // using the configuration's language and voice
    return new Promise<PassThroughStream>(async (resolve, reject): Promise<void> => {
      try {
        const [response] = await this._ttsClient.synthesizeSpeech({
          // wtf google cloud (declares enum type on audioEncoding
          // but guides show passing string)
          audioConfig: {
            audioEncoding: 2, // mp3
            pitch: data.config.pitch,
            speakingRate: data.config.speed,
          },
          input: { text: data.text },
          voice: { languageCode: data.config.lang, name: data.config.voice },
        });

        if (response.audioContent !== null && response.audioContent !== undefined) {
          // create a stream for discord voice and convert
          // gcloud response (ArrayBuffer) -convert-> Buffer -write-to-> stream
          const audioStream: PassThroughStream = new PassThroughStream({
            highWaterMark: 65536,
          });
          audioStream.end(Buffer.from(response.audioContent.buffer));
          resolve(audioStream);
        } else {
          reject(new Error("audioContent is undefined"));
        }
      } catch (err) {
        // gcloud tts might fail if someone sets voice/lang
        // wrong or smth dumb like that lol
        data.config.reset();
        console.warn("reset voice to default");
        reject(err);
      }
    });
  }
}
