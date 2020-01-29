// for creating streams to pass into discord 
import { PassThrough as PassThroughStream } from "stream";
// for converting ArrayBuffer into Buffer because
// they are surprisingly not similar
import { Buffer } from "buffer";
// for format strings :)
import util from "util";

// for gcloud and discord authentication
// loads module and adds env vars immediately
require("dotenv-safe").config();
// for storing many ongoing tts sessions
const HashMap = require("hashmap");
const ttsConfigs = new HashMap();

// ... yes
import { Message, SnowflakeUtil, Client as DiscordClient } from "discord.js";
const discordClient: DiscordClient = new DiscordClient();

import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";
import { TextToSpeechClient as GCloudTTSClient } from "@google-cloud/text-to-speech";
const ttsClient: TextToSpeechClient = new GCloudTTSClient();

import TtsConfig from "./TtsConfig";



async function createTTSAudio(text: string, config: TtsConfig): Promise<PassThroughStream> {
  // gets the mp3 audio of the requested text
  // using the configuration's language and voice
  return new Promise<PassThroughStream>(async (resolve: Function, reject: Function) => {
    try {
      let [response] = await ttsClient.synthesizeSpeech({
        input: { text: text},
        voice: { languageCode: config.lang, name: config.voice },
        // wtf google cloud (declares enum type on audioEncoding
        // but guides show passing string)
        audioConfig: { audioEncoding: 2 }  // "MP3" }
      });

      if (response.audioContent) {
        // create a stream for discord voice and convert
        // gcloud response (ArrayBuffer) -convert-> Buffer -write-to-> stream
        let audioStream: PassThroughStream = new PassThroughStream({ highWaterMark: 65536 });
        audioStream.end(Buffer.from(response.audioContent.buffer));
        resolve(audioStream);
      } else {
        reject(new Error("audioContent is undefined"));
      }
    } catch (err) {
      // gcloud tts might fail if someone sets voice/lang
      // wrong or smth dumb like that lol
      config.setLang("en-US");
      config.setVoiceOption("B");
      console.log("reset voice to default");
      reject(err);
    }
  });
}



discordClient.on("message", async (msg: Message) => {
  if (!msg.member) {
    // only respond to non dm (server) messages
    console.log(msg);
    return;
  }

  let config: TtsConfig = ttsConfigs.get(msg.channel.id);
  if (config && msg.author.id == config.speaker) {
    // if in speaking mode
    if (msg.content.substring(0, 1) == "*") {
      let args: string[] = msg.content.substring(1).split(" ");
      try {
        switch (args[0]) {
          case "help":
            await msg.reply("`*leave` to be lonely again, `*set-voice voice [lang]` to change voice (`*set-voice B en-US`)");
            break;
          case "leave":
            config.conn.disconnect();
            ttsConfigs.remove(msg.channel.id);
            break;
          case "set-voice":
            // not the best error checking but better than nothing
            if (args.length > 2) {
              if (!config.setLang(args[2])) {
                await msg.reply("invalid lang (expected something like en-US)");
              }
            }
            if (!config.setVoiceOption(args[1])) {
              await msg.reply("invalid voice (expected one character a to f)");
            }
            break;
          case "reset-voice":
            config.setLang("en-US");
            config.setVoiceOption("B");
            break;
          case "mine-all-day":
            // haha yes
            config.conn.play("Mine All Day (Minecraft Music Video).mp3");
            break;
          default:
            await msg.reply("unknown command "+args[0]);
        }
      } catch (err) {
        // msg sending basically never fails in usual
        // conditions why am i doing this ahhhhhhhh
        console.log(err);
      }
    } else {
      // speak all non-command messages
      // technically all messages that don't begin with '*'
      createTTSAudio(msg.content, config)
        .then((stream: PassThroughStream) => {
          if (!stream) {
            msg.channel.send("failed to send");
          } else {
            config.conn.play(stream, { seek: 0, volume: 1 });
          }
        })
        .catch((err: any) => {
          console.log(err);
          msg.channel.send("failed to send");
        });
    }
  } else if (msg.content.substring(0, 1) == "*") {
    // if not in speaking mode
    let args: string[] = msg.content.substring(1).split(" ");
    try {
      switch (args[0]) {
        case "ping":
          // get the time of the "*ping" message
          let startTime: number = SnowflakeUtil.deconstruct(msg.id).timestamp;
          let response: Message = await msg.channel.send("pong uwu");
          // take the "pong uwu" response message object and find the
          // timestamp get time delta between ping and pong,
          // edit the pong message to include the time
          let endTime: number = SnowflakeUtil.deconstruct(response.id).timestamp;
          await response.edit(util.format("pong uwu: %dms", endTime-startTime));
          break;
        case "im-lonely":
          if (msg.member.voice.channel) {
            ttsConfigs.set(
              msg.channel.id,
              new TtsConfig(
                msg.channel.id,
                msg.author.id,
                await msg.member.voice.channel.join()
              )
            );
            await msg.channel.send("voice channel joined");
          } else {
            await msg.reply("you are not in a voice channel");
          }
          break;
        case "help":
          await msg.reply("`*ping` to ping, `*im-lonely` to be less lonely");
          break;
      }
    } catch (err) {
      // random errors in sending messages or editing
      // or whatever, nothing we can do but catch and log
      console.log(err);
    }
  }
});

discordClient.on("ready", () => {
  console.log("logged in");
});



discordClient.login(process.env.DISCORD_BOT_TOKEN);
