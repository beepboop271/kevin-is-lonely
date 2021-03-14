# kevin-is-lonely

A Discord bot which allows people without a mic to "speak" in voice channels, using TTS.

### Note: Google Cloud Text to Speech now requires billing enabled to use the free quota, so you can't just run this with a completely free project (free usage quota is the same, you just need to put a billing method on the project to use the quota).

Backstory: I don't really use a mic or like to talk so I just sit in voice channels and listen to my friends do whatever. Sometimes when I need to talk, I'll just type into a text channel. However, this only works when the other people in the voice channel can easily look at Discord, something not very practical when others are playing games for example. Then one day, we decided to create a channel #kevin-is-lonely because when I sent text messages to talk to people in a voice channel it would look like I'm talking to myself. Someone had the great idea of making a bot to read messages that I sent to #kevin-is-lonely so that i could "speak" in the voice channel, and here it is :p

## Features:
- Google Cloud TTS, using Wavenet voices for cool voices
- Supports as many languages and accents as Google supports, including but not limited to English (US), English (GB), French, Japanese, Mandarin
- The latency between the text message and speaking is quite minimal in my personal use case, which involves running the bot on my desktop and at most two different guilds using it at the same time, no clue if it would scale (I guess the performance is just up to how efficiently the voice stream can be sent, and how quickly Google responds to the request)
- Multiple users supported in one voice channel, messages can be queued up (to a limit) and spoken, and each person using the bot can have a different voice to allow the people listening to differentiate
- idk there might be more interesting things

## Running:
- You need Node 14.x for top level await support which is used when loading the bot
- Create a Google Cloud project and enable the [Text to Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com) or enable the API in an existing project
- Go to the Credentials tab of the TTS API and create new credentials using a Service Account, create a key for the account, and download the `.json` file (or use existing credentials)
- Create a [Discord application](https://discord.com/developers/applications) and go to the Bot tab to find the token, or get the token of an existing bot
- Create a `.env` file with the required variables (found in `.env.example`): the Discord bot token, and the path to the `.json` file from before
- Install the dependencies `npm i`
- Then just use `npm run start`
- Alternatively, if you have TypeScript installed globally, replace `npx tsc` with `tsc`
- Invite your bot to the guilds you want to use it in
- Disclaimer: Not 100% sure if these are good instructions, it's been a while since I did this

## Using:
- TLDR: Use `*help`
- Join a voice channel that you want the bot to speak in
- Use `*im-lonely`, which will either summon the bot or add you as another user (note: the bot can only be in one voice channel of one guild at a time, like any other user)
- All messages that you type which do not begin with `*` will be spoken with TTS
- Using `*help` while using the bot or `*help tts` will tell you how to change your voice
- Using `*list` can tell you what voices/languages are supported
