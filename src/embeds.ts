import {
  EmbedFieldData,
  MessageEmbed,
  MessageEmbedOptions,
} from "discord.js";

import { IVoice, IVoiceOptions } from "./voiceOptions";

interface IBotVoiceEmbeds {
  languageList: MessageEmbed;
  voiceList: Map<string, MessageEmbed>;
}

export interface IBotEmbeds extends IBotVoiceEmbeds {
  generalHelp: MessageEmbed;
  voiceHelp: MessageEmbed;
}

const templateEmbed: MessageEmbedOptions = {
  color: 0,
  author: {
    name: "not-lonely",
    url: "https://github.com/beepboop271/kevin-is-lonely",
  },
  footer: {
    text: "kill me",
  },
};

const getCommand = (voiceName: string): string => {
  const parts = voiceName.toLowerCase().split("-wavenet-");

  return `*set-voice ${parts[1]} ${parts[0]}`;
};

const generateVoiceListEmbed = (language: string, voices: IVoice[]): MessageEmbed =>
  new MessageEmbed({
    ...templateEmbed,
    description: `Overview of all voices available for ${language.toUpperCase()}. To select a voice for TTS, use \`*set-voice [voice] [language (optional)]\`. Examples: \`*set-voice b en-us\`, \`*set-voice c\``,
    fields: voices.map((voice): EmbedFieldData => ({
      name: voice.name,
      value: `\`${getCommand(voice.name)}\`\nGender: ${voice.gender}`,
      inline: true,
    })),
    title: `Supported Voices for ${language.toUpperCase()}`,
  }).setFooter("kill me | TODO: make this page look better/easier to read");

const generateVoiceEmbeds = (voiceOptions: IVoiceOptions): IBotVoiceEmbeds => {
  const languageList = Array.from(voiceOptions.languages.values())
    .sort()
    .join("\n");

  const voiceList = new Map<string, MessageEmbed>();
  for (const [language, voices] of voiceOptions.voiceMap) {
    voiceList.set(language, generateVoiceListEmbed(language, voices));
  }

  return {
    languageList: new MessageEmbed({
      ...templateEmbed,
      description: `Overview of all languages available. To list voices available in each language, use: \`*list [language code]\`\n\`\`\`${languageList}\`\`\``,
      title: "Supported Languages",
    }),
    voiceList,
  };
};

export const generateEmbeds = (voiceOptions: IVoiceOptions): IBotEmbeds => ({
  ...generateVoiceEmbeds(voiceOptions),
  generalHelp: new MessageEmbed({
    ...templateEmbed,
    description: "General bot help. Use `*help tts` (or `*help` when using the bot) for help with TTS",
    fields: [
      {
        name: "`*help`",
        value: "Displays either general or TTS help depending on whether the user is using the bot or not.",
      },
      {
        name: "`*help [general or tts]`",
        value: "Displays the help page requested.",
      },
      {
        name: "`*ping`",
        value: "Ping the bot.",
      },
      {
        name: "`*list`",
        value: "Displays all the possible languages for TTS.",
      },
      {
        name: "`*list [language code]`",
        value: "Displays all the possible voices for the language specified.",
      },
      {
        name: "`*im-lonely`",
        value: "Summons the bot to speak the messages the user sends in the current text channel with TTS in their current voice channel.",
      },
    ],
    title: "General Help",
  }),
  voiceHelp: new MessageEmbed({
    ...templateEmbed,
    description: "TTS bot help. Use `*help general` (or `*help` when not using the bot) for non-TTS help",
    fields: [
      {
        name: "`*leave`",
        value: "Stops the bot from speaking the user's messages. If no other users are using TTS, also leaves the voice channel.",
      },
      {
        name: "`*list current`",
        value: "Equivalent to `*list [language code]` with the language the user is currently using.",
      },
      {
        name: "`*set-voice [voice] [language (optional)]`",
        value: "Changes the bot to use the voice specified. Uses the current language, unless a new language has been specified. Examples: `*set-voice b en-us`, `*set-voice c`",
      },
      {
        name: "`*set-pitch [-20 <= pitch change <= 20]`",
        value: "Modifies the pitch by the value specified. Positive means higher pitch. May cause distortion at extreme values.",
      },
      {
        name: "`*set-speed [0.25 <= speed <= 4]`",
        value: "Modifies the speed by the value specified. Greater than one means faster. May cause distortion at extreme values.",
      },
      {
        name: "`*reset-voice`",
        value: "Resets voice to default. Equivalent to `*set-voice b en-us`, `*set-pitch 0`, and `*set-speed 1`.",
      },
    ],
    title: "TTS Help",
  }),
});
