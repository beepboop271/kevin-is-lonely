import _default from "@google-cloud/text-to-speech";

import { generateEmbeds } from "./embeds";

const ttsClient = new _default.TextToSpeechClient();

console.time("init tts");
await ttsClient.initialize();
console.timeEnd("init tts");

console.time("embed");
const embeds = await generateEmbeds(ttsClient);
console.timeEnd("embed");

export {
  ttsClient,
  embeds,
};
