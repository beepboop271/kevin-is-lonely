// actual class
import { TextToSpeechClient as GCloudTTSClient } from "@google-cloud/text-to-speech";
// type definition :/
// tslint:disable-next-line:no-submodule-imports
import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";
import chalk from "chalk";
import {
  Client as DiscordClient,
  Message,
  MessageAttachment,
  SnowflakeUtil,
  TextChannel,
} from "discord.js";
import { config as loadEnv } from "dotenv-safe";

import { ServerConfig } from "./serverConfig";
import { ServerMusicConfig } from "./serverMusicConfig";
import { ServerTtsConfig } from "./serverTtsConfig";
import { UserTtsConfig } from "./userTtsConfig";

loadEnv();

const discordClient: DiscordClient = new DiscordClient();
const ttsClient: TextToSpeechClient = new GCloudTTSClient();

// for storing many ongoing tts sessions
const serverConfigs = new Map<string, ServerConfig<unknown>>();

// tslint:disable:no-any no-unsafe-any
const error = (x: any): void => {
  process.stdout.write("\u274C\uFE0F ");
  if (x.stack !== undefined) {
    console.error(chalk.red(x.stack));
  } else {
    console.error(chalk.red(x));
  }
};
const warn = (x: any): void => {
  process.stdout.write("\u26A0\uFE0F ");
  if (x.stack !== undefined) {
    console.error(chalk.yellow(x.stack));
  } else {
    console.error(chalk.yellow(x));
  }
};
const log = (x: any): void => {
  process.stdout.write("\u2139\uFE0F ");
  if (x.stack !== undefined) {
    console.log(chalk.grey(x.stack));
  } else {
    console.log(chalk.grey(x));
  }
};
// tslint:enable

const logMessage = (msg: Message): void => {
  if (msg.member === null || msg.guild === null) {
    log(chalk`{red DM:} {grey ${msg.createdAt.toLocaleString()}:} {blueBright ${msg.author.username}:}\n{white ${msg.content}}\n`);
  } else {
    log(chalk`{grey ${msg.createdAt.toLocaleString()}:} {greenBright ${msg.guild.name}: #${(msg.channel as TextChannel).name}:} {blueBright ${msg.author.username} (${msg.member.nickname})}`);
    if (msg.attachments.size > 0) {
      log("attachments:");
      msg.attachments.forEach((attachment: MessageAttachment): void => {
        log(`${attachment.proxyURL}`);
      });
    }
    log(`${chalk.white(msg.content)}\n`);
  }
};

discordClient.on("message", async (msg: Message): Promise<void> => {
  logMessage(msg);
  if (msg.member === null || msg.guild === null) {
    // only respond to non dm (server) messages
    // msg.guild check is redundant but helps ts know it's null too
    return;
  }

  const serverConfig: ServerConfig<unknown> | undefined = serverConfigs.get(msg.guild.id);
  let userConfig: UserTtsConfig | undefined;
  if (
    serverConfig !== undefined
    && msg.channel.id === serverConfig.textChannel
  ) {
    try {
      if (await serverConfig.handleMessage(msg)) {
        serverConfigs.delete(msg.guild.id);
      }
    } catch (e) {
      msg.channel.send(`failed to send: ${e}`).catch((e): void => { error(e); });
      error(e);
    }
    if (serverConfig instanceof ServerTtsConfig) {
      userConfig = serverConfig.getUserConfig(msg.author.id);
    }
  }
  if (
    !(serverConfig !== undefined && serverConfig instanceof ServerMusicConfig)
    && userConfig === undefined
    && msg.content.substring(0, 1) === "*"
  ) {
    // if not in speaking mode
    const args: string[] = msg.content.substring(1).split(" ");
    try {
      if (args[0] === "ping") {
        // get the time of the "*ping" message
        const startTime: number = SnowflakeUtil.deconstruct(msg.id).timestamp;
        const response: Message = await msg.channel.send("pong uwu");
        // take the "pong uwu" response message object and find the
        // timestamp get time delta between ping and pong,
        // edit the pong message to include the time
        const endTime: number = SnowflakeUtil.deconstruct(response.id)
          .timestamp;
        await response.edit(`pong uwu: ${endTime - startTime}ms`);
      } else if (args[0] === "help") {
        await msg.reply("`*ping` to ping, `*im-lonely` to be less lonely");
      } else if (args[0] === "im-lonely" || args[0] === "music") {
        if (msg.member.voice.channel === null) {
          await msg.reply("you are not in a voice channel");
        } else {
          if (serverConfig !== undefined) {
            if (
              serverConfig instanceof ServerTtsConfig
              && serverConfig.voiceChannel === msg.member.voice.channel.id
            ) {
              serverConfig.addUser(msg.author.id);
              await msg.channel.send("added user");
            } else {
              await msg.channel.send("bot in use already");
            }
          } else {
            let newServerConfig: ServerConfig<unknown> | undefined;
            if (args[0] === "im-lonely") {
              newServerConfig = new ServerTtsConfig(
                msg.member.voice.channel.id,
                msg.channel.id,
                await msg.member.voice.channel.join(),
                ttsClient,
              ).addUser(msg.author.id);
            } else {
              newServerConfig = new ServerMusicConfig(
                msg.member.voice.channel.id,
                msg.channel.id,
                await msg.member.voice.channel.join(),
              );
            }
            serverConfigs.set(msg.guild.id, newServerConfig);
            await msg.channel.send("voice channel joined");
          }
        }
      }
    } catch (err) {
      // random errors in sending messages or editing
      // or whatever, nothing we can do but catch and log
      warn(err);
    }
  }
});

discordClient.on("ready", (): void => {
  log(chalk.blueBright("logged in"));
});

discordClient.login(process.env.DISCORD_BOT_TOKEN).catch(error);
