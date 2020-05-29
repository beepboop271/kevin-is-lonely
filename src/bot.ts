import _default from "@google-cloud/text-to-speech";
const { TextToSpeechClient } = _default;
// ??? hmmm
// import { TextToSpeechClient } from "@google-cloud/text-to-speech";
//          ^^^^^^^^^^^^^^^^^^
// SyntaxError: The requested module '@google-cloud/text-to-speech' is
// expected to be of type CommonJS, which does not support named exports.
// CommonJS modules can be imported by importing the default export.
// For example:
// import pkg from '@google-cloud/text-to-speech';
// const { TextToSpeechClient } = pkg;
//     at ModuleJob._instantiate (internal/modules/esm/module_job.js:97:21)
//     at async ModuleJob.run (internal/modules/esm/module_job.js:135:5)
//     at async Loader.import (internal/modules/esm/loader.js:178:24)

import { generateEmbeds } from "./embeds";
import { getVoices } from "./voiceOptions";

const ttsClient = new TextToSpeechClient();

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
