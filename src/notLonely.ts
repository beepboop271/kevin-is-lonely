import chalk from "chalk";
import {
  Client as DiscordClient,
  Message,
  MessageAttachment,
  SnowflakeUtil,
  TextChannel,
} from "discord.js";

import { embeds } from "./bot";
import { ServerConfig } from "./serverConfig";
import { ServerMusicConfig } from "./serverMusicConfig";
import { ServerTtsConfig } from "./serverTtsConfig";
import { UserTtsConfig } from "./userTtsConfig";

// tslint:disable:no-any no-unsafe-any
// const stringify = (x: any): string => JSON.stringify(x, undefined, 2);
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

const discordClient: DiscordClient = new DiscordClient();

// for storing many ongoing tts sessions
const serverConfigs = new Map<string, ServerConfig<unknown>>();

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

  const args: readonly string[] = msg.content.substring(1).split(" ");
  if (msg.content.charAt(0) === "*") {
    try {
      switch (args[0]) {
        case "ping":
          // get the time of the "*ping" message
          const startTime: number = SnowflakeUtil.deconstruct(msg.id).timestamp;
          const response: Message = await msg.channel.send("pong uwu");
          // take the "pong uwu" response message object and find the
          // timestamp get time delta between ping and pong,
          // edit the pong message to include the time
          const endTime: number = SnowflakeUtil.deconstruct(response.id).timestamp;
          await response.edit(`pong uwu: ${endTime - startTime}ms`);

          return;
        case "list":
          if (args.length > 1) {
            const voices = embeds.voiceList.get(args[1]);
            if (voices === undefined) {
              await msg.reply("Found no such language");
            } else {
              await msg.channel.send(voices);
            }
          } else {
            await msg.channel.send(embeds.languageList);
          }

          return;
        case "help":
          // if the user just said "*help" (non-absolute), figure which
          // help to send later.
          if (args.length > 1) {
            if (args[1].toLowerCase() === "general") {
              await msg.channel.send(embeds.generalHelp);

              return;
            }
            if (args[1].toLowerCase() === "tts") {
              await msg.channel.send(embeds.voiceHelp);

              return;
            }
          }
      }
    } catch (e) {
      warn(e);
    }
  }

  const serverConfig: ServerConfig<unknown> | undefined = serverConfigs.get(msg.guild.id);
  let userConfig: UserTtsConfig | undefined;
  if (
    serverConfig !== undefined
    && msg.channel.id === serverConfig.textChannel
  ) {
    try {
      if (await serverConfig.handleMessage(msg, args)) {
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
    msg.content.charAt(0) === "*"
    && userConfig === undefined
    && (serverConfig === undefined || serverConfig instanceof ServerTtsConfig)
  ) {
    // if not in speaking mode
    try {
      if (args[0] === "help") {
        await msg.channel.send(embeds.generalHelp);
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
            let newServerConfig: ServerConfig<unknown>;
            if (args[0] === "im-lonely") {
              newServerConfig = new ServerTtsConfig(
                msg.member.voice.channel.id,
                msg.channel.id,
                await msg.member.voice.channel.join(),
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
    } catch (e) {
      // random errors in sending messages or editing
      // or whatever, nothing we can do but catch and log
      warn(e);
    }
  }
});

discordClient.on("ready", (): void => {
  log(chalk.blueBright("logged in"));
});

discordClient.login(process.env.DISCORD_BOT_TOKEN).catch(error);
