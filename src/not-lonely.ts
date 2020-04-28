// for gcloud and discord authentication
// loads module and adds env vars immediately
require("dotenv-safe").config();
// actual class
import { TextToSpeechClient as GCloudTTSClient } from "@google-cloud/text-to-speech";
// type definition :/
import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";
import {
  Client as DiscordClient,
  Message,
  MessageAttachment,
  SnowflakeUtil,
  TextChannel,
} from "discord.js";

import { ServerConfig } from "./ServerConfig";
import { ServerMusicConfig } from "./ServerMusicConfig";
import { ServerTtsConfig } from "./ServerTtsConfig";
import { UserTtsConfig } from "./UserTtsConfig";

const discordClient: DiscordClient = new DiscordClient();
const ttsClient: TextToSpeechClient = new GCloudTTSClient();

// for storing many ongoing tts sessions
// ServerConfig<any> because typescript doesn't seem to
// allow unspecified generic types on an abstract class
// even though all the implementing classes have a type?
const serverConfigs = new Map<string, ServerConfig<any>>();

// tslint:disable-next-line:cyclomatic-complexity
discordClient.on("message", async (msg: Message) => {
  if (msg.member === null || msg.guild === null) {
    // only respond to non dm (server) messages
    // msg.guild check is redundant but helps ts know it's null too
    console.log(`DM: ${msg.author.username}:\n${msg.content}\n`);

    return;
  }
  console.log(
    `${msg.guild.name}: #${(msg.channel as TextChannel).name}: ${
      msg.author.username
    } (${msg.member.nickname})\n${msg.content}`
  );
  if (msg.attachments.size > 0) {
    msg.attachments.forEach((attachment: MessageAttachment) => {
      console.log(attachment.proxyURL);
      console.log("\n");
    });
  } else {
    console.log("");
  }

  if (msg.author.id === process.env.LOL) {
    return;
  }

  // msg.guild is not null because we checked msg.member
  const serverConfig: ServerConfig<any> | undefined = serverConfigs.get(
    msg.guild.id
  );
  let userConfig: UserTtsConfig | undefined;
  if (
    serverConfig !== undefined &&
    serverConfig instanceof ServerTtsConfig &&
    msg.channel.id === serverConfig.textChannel
  ) {
    userConfig = serverConfig.getUserConfig(msg.author.id);
    if (userConfig !== undefined) {
      // if in speaking mode
      if (msg.content.substring(0, 1) === "*") {
        const args: string[] = msg.content.substring(1).split(" ");
        try {
          switch (args[0]) {
            case "help":
              await msg.reply(
                "`*leave` to be lonely again, `*set-voice voice [lang]` to change voice (`*set-voice B en-US`)"
              );
              break;
            case "leave":
              if (serverConfig.deleteUser(msg.author.id)) {
                serverConfigs.delete(msg.guild.id);
              }
              break;
            case "set-voice":
              // not the best error checking but better than nothing
              if (args.length > 2) {
                if (!userConfig.setLang(args[2])) {
                  await msg.reply(
                    "invalid lang (expected something like en-US)"
                  );
                }
              }
              if (!userConfig.setVoiceOption(args[1])) {
                await msg.reply(
                  "invalid voice (expected one character a to f)"
                );
              }
              break;
            case "set-pitch":
              if (!userConfig.setPitch(Number(args[1]))) {
                await msg.reply(
                  "invalid pitch (expected a number -20.0 to 20.0)"
                );
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
        } catch (err) {
          // msg sending basically never fails in usual
          // conditions why am i doing this ahhhhhhhh
          console.log(err);
        }
      } else {
        // speak all non-command messages
        // technically all messages that don't begin with '*'
        try {
          await serverConfig.enqueue({ text: msg.content, config: userConfig });
          // serverConfig.playMessage(await createTTSAudio(msg.content, userConfig));
        } catch (err) {
          console.log(err);
          msg.channel.send(`failed to send: ${err}`).catch(console.error);
        }
      }
    }
  }
  if (userConfig !== undefined && msg.content.substring(0, 1) === "*") {
    // if not in speaking mode
    const args: string[] = msg.content.substring(1).split(" ");
    try {
      switch (args[0]) {
        case "ping":
          // get the time of the "*ping" message
          const startTime: number = SnowflakeUtil.deconstruct(msg.id).timestamp;
          const response: Message = await msg.channel.send("pong uwu");
          // take the "pong uwu" response message object and find the
          // timestamp get time delta between ping and pong,
          // edit the pong message to include the time
          const endTime: number = SnowflakeUtil.deconstruct(response.id)
            .timestamp;
          await response.edit(`pong uwu: ${endTime - startTime}ms`);
          break;
        case "music":
          if (msg.member.voice.channel !== null) {
            if (serverConfig !== undefined) {
              if (serverConfig instanceof ServerTtsConfig) {
                await msg.channel.send("bot in use for tts already");
              } else {
                await msg.channel.send("bot in use in another channel already");
              }
            } else {
              const newServerConfig: ServerMusicConfig = new ServerMusicConfig(
                await msg.member.voice.channel.join()
              );
              serverConfigs.set(msg.guild.id, newServerConfig);
              await msg.channel.send("voice channel joined");
            }
          } else {
            await msg.reply("you are not in a voice channel");
          }
        case "im-lonely":
          if (msg.member.voice.channel !== null) {
            if (serverConfig !== undefined && serverConfig instanceof ServerTtsConfig) {
              if (serverConfig.voiceChannel === msg.member.voice.channel.id) {
                serverConfig.addUser(msg.author.id);
                await msg.channel.send("added user");
              } else {
                await msg.reply("bot in use in another channel already");
              }
            } else {
              const newServerConfig: ServerTtsConfig = new ServerTtsConfig(
                msg.member.voice.channel.id,
                msg.channel.id,
                await msg.member.voice.channel.join(),
                ttsClient
              );
              newServerConfig.addUser(msg.author.id);
              serverConfigs.set(msg.guild.id, newServerConfig);
              await msg.channel.send("voice channel joined");
            }
          } else {
            await msg.reply("you are not in a voice channel");
          }
          break;
        case "help":
          await msg.reply("`*ping` to ping, `*im-lonely` to be less lonely");
          break;
        default:
      }
    } catch (err) {
      // random errors in sending messages or editing
      // or whatever, nothing we can do but catch and log
      console.error(err);
    }
  }
});

discordClient.on("ready", () => {
  console.log("logged in");
});

discordClient.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);
