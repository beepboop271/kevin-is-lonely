// tslint:disable-next-line:no-submodule-imports
import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";
import {
  EmbedFieldData,
  MessageEmbed,
  MessageEmbedOptions,
} from "discord.js";

interface IBotVoiceEmbeds {
  languageList: MessageEmbed;
  voiceList: Map<string, MessageEmbed>;
}
export interface IBotEmbeds extends IBotVoiceEmbeds {
  generalHelp: MessageEmbed;
  voiceHelp: MessageEmbed;
}
interface IVoiceType {
  name: string;
  gender: "SSML_VOICE_GENDER_UNSPECIFIED" | "MALE" | "FEMALE" | "NEUTRAL";
}
interface IVoiceOptions {
  possibleLanguages: Set<string>;
  voiceMap: Map<string, IVoiceType[]>;
}

// tslint:disable-next-line:no-any
const stringify = (x: any): string => JSON.stringify(x, undefined, 2);

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

const retrieveVoiceOptions = async (ttsClient: TextToSpeechClient): Promise<IVoiceOptions> => {
  const possibleLanguages = new Set<string>();
  const voiceMap = new Map<string, IVoiceType[]>();

  const [voiceOptions] = await ttsClient.listVoices({});

  let languageCode: string;
  let maybeVoiceList: IVoiceType[] | undefined;
  voiceOptions.voices?.forEach((voice): void => {
    if (
      voice.languageCodes === undefined
      || voice.languageCodes === null
      || voice.name === undefined
      || voice.name === null
      || voice.ssmlGender === undefined
      || voice.ssmlGender === null
    ) {
      throw new Error(`list voice request was missing fields: ${stringify(voice)}`);
    }

    if (voice.name.includes("Standard")) {
      return;
    }

    languageCode = voice.languageCodes[0].split("-")[0];

    if (typeof voice.ssmlGender === "string") {
      possibleLanguages.add(languageCode);

      maybeVoiceList = voiceMap.get(languageCode);
      if (maybeVoiceList === undefined) {
        voiceMap.set(languageCode, [{
          name: voice.name,
          gender: voice.ssmlGender,
        }]);
      } else {
        maybeVoiceList.push({
          name: voice.name,
          gender: voice.ssmlGender,
        });
      }
    } else {
      throw new Error(`list voice request had bad gender field: ${stringify(voice)}`);
    }
  });

  for (const [, voiceList] of voiceMap) {
    voiceList.sort((a, b): number => a.name.localeCompare(b.name));
  }

  return {
    possibleLanguages,
    voiceMap,
  };
};

const getCommandFromVoiceName = (voiceName: string): string => {
  const parts = voiceName.toLowerCase().split("-wavenet-");

  return `${parts[1]} ${parts[0]}`;
};

const generateVoiceListEmbed = (language: string, voices: IVoiceType[]): MessageEmbed =>
  new MessageEmbed({
    ...templateEmbed,
    description: `Overview of all voices available for ${language.toUpperCase()}. To select a voice for TTS, use \`*set-voice [voice] [language (optional)]\`. Examples: \`*set-voice b en-us\`, \`*set-voice c\``,
    fields: voices.map((voiceType): EmbedFieldData => ({
      name: voiceType.name,
      value: `\`*set-voice ${getCommandFromVoiceName(voiceType.name)}\`\nGender: ${voiceType.gender}`,
      inline: true,
    })),
    title: `Supported Voices for ${language.toUpperCase()}`,
  });

const generateVoiceEmbeds = async (ttsClient: TextToSpeechClient): Promise<IBotVoiceEmbeds> => {
  console.time("get voices");
  const voiceOptions = await retrieveVoiceOptions(ttsClient);
  console.timeEnd("get voices");

  const voiceEmbeds: IBotVoiceEmbeds = {
    languageList: new MessageEmbed({
      ...templateEmbed,
      description: `Overview of all languages available. To list voices available in each language, use: \`*list [language code]\`\n\`\`\`${
        [...voiceOptions.possibleLanguages.values()].sort().join("\n")
      }\`\`\``,
      title: "Supported Languages",
    }),
    voiceList: new Map(
      [...voiceOptions.voiceMap.entries()].map(
        ([language, voices]): [string, MessageEmbed] =>
          [language, generateVoiceListEmbed(language, voices)]),
    ),
  };

  return voiceEmbeds;
};

export const generateEmbeds = async (ttsClient: TextToSpeechClient): Promise<IBotEmbeds> =>
  ({
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
    ...(await generateVoiceEmbeds(ttsClient)),
  });
