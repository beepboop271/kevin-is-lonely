// for creating streams to pass into discord voice
const stream = require("stream");
// for converting ArrayBuffer into Buffer because
// they are surprisingly not similar
const buffer = require("buffer");
// for format strings :)
const util = require("util");

// for gcloud and discord authentication
// loads module and adds env vars immediately
require("dotenv-safe").config();
// for storing many ongoing tts sessions
const HashMap = require("hashmap");
const ttsConfigs = new HashMap();
// ... yes
const Discord = require("discord.js");
const discordClient = new Discord.Client();
// ... yes but again
const Tts = require("@google-cloud/text-to-speech")
const ttsClient = new Tts.TextToSpeechClient();



function addConfig(channel, speaker, conn) {
  let config = {
    channel: channel,
    speaker: speaker,
    conn: conn,
    voice: "en-US-Wavenet-B",
    lang: "en-US"
  };
  ttsConfigs.set(channel, config);
}

async function createTTSAudio(text, config) {
  // gets the mp3 audio of the requested text
  // using the configuration's language and voice
  try {
    let [response] = await ttsClient.synthesizeSpeech({
      input: { text: text },
      voice: { languageCode: config.lang, name: config.voice },
      audioConfig: { audioEncoding: "MP3" }
    });

    // create a stream for discord voice and convert
    // gcloud response (ArrayBuffer) -convert-> Buffer -write-to-> stream
    let audioStream = new stream.PassThrough({ highWaterMark: 65536 });
    audioStream.end(buffer.Buffer.from(response.audioContent.buffer));
    // implicitly makes a promise or something? :/
    return audioStream;
  } catch (err) {
    // gcloud tts might fail if someone sets voice/lang
    // wrong or smth dumb like that lol
    console.log(err);
  }
}



discordClient.on("message", async (msg) => {
  if (!msg.guild) return;  // only respond to non dm (server) messages

  let config = ttsConfigs.get(msg.channel.id);
  if (config && msg.author.id == config.speaker) {
    // if in speaking mode
    if (msg.content.substring(0, 1) == "*") {
      args = msg.content.substring(1).split(" ");
      try {
        switch (args[0]) {
          case "help":
            await msg.reply("`*leave` to be lonely again, `*set-voice voice [lang]` to change voice (`*set-voice B en-US`)");
            break;
          case "leave":
            config.conn.disconnect();
            ttsConfigs.remove(msg.channel.id);
            break;
          case "set-voice":
            if (args.length > 2) {
              config.lang = args[2];
            }
            config.voice = config.lang+"-Wavenet-"+args[1];
            break;
          case "reset-voice":
            config.voice = "en-US-Wavenet-B";
            config.lang = "en-US";
            break;
          case "mine-all-day":
            // haha yes
            config.conn.play("Mine All Day (Minecraft Music Video).mp3");
            break;
          default:
            await msg.reply("unknown command "+args[0]);
        }
      } catch (err) {
        // msg sending basically never fails in usual
        // conditions why am i doing this ahhhhhhhh
        console.log(err);
      }
    } else {
      // speak all non-command messages
      // technically all messages that don't begin with '*'
      createTTSAudio(msg.content, config).then(stream => {
        config.conn.play(stream, { seek: 0, volume: 1 });
      });
    }
  } else if (msg.content.substring(0, 1) == "*") {
    // if not in speaking mode
    let args = msg.content.substring(1).split(" ");
    try {
      switch (args[0]) {
        case "ping":
          // get the time of the "*ping" message
          let startTime = Discord.SnowflakeUtil.deconstruct(msg.id).timestamp;
          let response = await msg.channel.send("pong uwu");
          // take the "pong uwu" response message object and find the
          // timestamp get time delta between ping and pong,
          // edit the pong message to include the time
          let endTime = Discord.SnowflakeUtil.deconstruct(response.id).timestamp;
          await response.edit(util.format("pong uwu: %dms", endTime-startTime));
          break;
        case "im-lonely":
          if (msg.member.voice.channel) {
            addConfig(
              msg.channel.id,
              msg.author.id,
              await msg.member.voice.channel.join()
            );
            await msg.channel.send("voice channel joined");
          } else {
            await msg.reply("you are not in a voice channel");
          }
          break;
        case "help":
          await msg.reply("`*ping` to ping, `*im-lonely` to be less lonely");
          break;
        default:
          await msg.reply("unknown command "+args[0]);
      }
    } catch (err) {
      // random errors in sending messages or editing
      // or whatever, nothing we can do but catch and log
      console.log(err);
    }
  }
});

discordClient.on("ready", () => {
  console.log("logged in");
});



discordClient.login(process.env.DISCORD_BOT_TOKEN);
