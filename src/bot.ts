import { default as gTTS } from "@google-cloud/text-to-speech";

import { generateEmbeds } from "./embeds";
import { getVoices } from "./voiceOptions";

const ttsClient = new gTTS.TextToSpeechClient();

console.time("Initialize TTS");
await ttsClient.initialize();
console.timeEnd("Initialize TTS");

const voiceOptions = await getVoices(ttsClient);

console.time("Generate embeds");
const embeds = generateEmbeds(voiceOptions);
console.timeEnd("Generate embeds");

export {
  ttsClient,
  embeds,
  voiceOptions,
};
