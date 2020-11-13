// tslint:disable-next-line:no-submodule-imports
import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";

export interface IVoice {
  name: string;
  gender: "SSML_VOICE_GENDER_UNSPECIFIED" | "MALE" | "FEMALE" | "NEUTRAL";
}

export interface IVoiceOptions {
  languages: Set<string>;  // e.g. "en" or "cmn"
  languageVariants: Set<string>;  // e.g. "en-US" or "cmn-CN"
  voiceVariants: Set<string>;
  voiceMap: Map<string, IVoice[]>;
}

export const getVoices = async (
  ttsClient: TextToSpeechClient,
): Promise<IVoiceOptions> => {
  console.time("Retrieving TTS voices from Google");
  const [ttsVoiceList] = await ttsClient.listVoices({});
  console.timeEnd("Retrieving TTS voices from Google");

  console.time("Parse TTS voice list");

  const voiceOptions: IVoiceOptions = {
    languages: new Set<string>(),
    languageVariants: new Set<string>(),
    voiceVariants: new Set<string>(),
    voiceMap: new Map<string, IVoice[]>(),
  };

  let languageCode: string;
  let maybeVoiceList: IVoice[] | undefined;
  if (ttsVoiceList.voices === undefined || ttsVoiceList.voices === null) {
    throw new Error(`error retrieving possible tts voices: ${JSON.stringify(ttsVoiceList)}`);
  }

  ttsVoiceList.voices.forEach((voice): void => {
    if (
      voice.languageCodes === undefined
      || voice.languageCodes === null
      || voice.name === undefined
      || voice.name === null
      || voice.ssmlGender === undefined
      || voice.ssmlGender === null
    ) {
      throw new Error(`list voice request was missing fields: ${JSON.stringify(voice)}`);
    }
    if (voice.name.includes("Standard")) {
      return;
    }
    if (typeof voice.ssmlGender !== "string") {
      throw new Error(`list voice request had bad gender field: ${JSON.stringify(voice)}`);
    }

    voiceOptions.voiceVariants.add(voice.name);

    languageCode = voice.languageCodes[0].toLowerCase();
    voiceOptions.languageVariants.add(languageCode);

    languageCode = languageCode.split("-")[0];
    voiceOptions.languages.add(languageCode);

    maybeVoiceList = voiceOptions.voiceMap.get(languageCode);
    if (maybeVoiceList === undefined) {
      voiceOptions.voiceMap.set(languageCode, [{
        name: voice.name,
        gender: voice.ssmlGender,
      }]);
    } else {
      maybeVoiceList.push({
        name: voice.name,
        gender: voice.ssmlGender,
      });
    }
  });

  for (const [, voiceList] of voiceOptions.voiceMap) {
    voiceList.sort((a, b): number => a.name.localeCompare(b.name));
  }

  console.timeEnd("Parse TTS voice list");

  return voiceOptions;
};
