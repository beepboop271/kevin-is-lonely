const fs = require("fs");
const util = require("util");

require("dotenv-safe").config();
const Discord = require("discord.js");
const Tts = require("@google-cloud/text-to-speech");

const discordClient = new Discord.Client();
discordClient.on("ready", () => {
  console.log("logged in");
});

// chr(x) from python, idk
// i just didn't want to type so much
let chr = String.fromCharCode;

let ttsConfig = {
  isUsing: false,
  channel: "",
  speaker: "",
  conn: null,
  voice: "en-US-Wavenet-B",
  lang: "en-US"
};
let fileName = 0;

async function createTTSAudio(text, callback) {
  // google cloud stuff
  let ttsClient = new Tts.TextToSpeechClient();
  let request = {
    input: { text: text },
    voice: { languageCode: ttsConfig.lang, name: ttsConfig.voice },
    audioConfig: { audioEncoding: "MP3" }
  };
  let [response] = await ttsClient.synthesizeSpeech(request);

  // write the file, add silence
  fileName = (fileName + 1) % 5;
  let path = "audio/" + chr(48 + fileName) + ".mp3";
  fs.writeFile(path, response.audioContent, "binary", err => {
    if (err) console.log(err);
    callback(util.format("audio/%s.mp3", chr(48 + fileName)));

    // discord.js stable version has bug where short files are
    // cut off, issue is fixed in master so this sketchy
    // ffmpeg re-encoding is no longer needed
    // ChildProcess.exec(
    //     util.format('ffmpeg -i %s.mp3 -af "apad=pad_dur=1" -y -hide_banner -loglevel panic %s.mp3',
    //                 chr(48+fileName), chr(97+fileName)),
    //     {cwd:auth.projectPath+'audio', windowsHide:true},
    //     (err, stdout, stderr) => {
    //       if(err) console.log(err);
    //       callback(util.format('audio/%s.mp3', chr(97+fileName)));
    //     }
    // );
  });
}

discordClient.on("message", msg => {
  if (!msg.guild) return;

  // if we need to speak this message
  if (ttsConfig.isUsing
        && msg.channel.id == ttsConfig.channel
        && msg.author.id == ttsConfig.speaker) {
    if (msg.content.substring(0, 1) == "*") {
      args = msg.content.substring(1).split(" ");

      if (args[0] == "help") {
        msg.reply("`*leave` to be lonely again, `*set-voice lang voice` to change voice (`*set-voice en-US B`)")
          .catch(console.log);
      } else if (args[0] == "leave") {
        ttsConfig.isUsing = false;
        ttsConfig.channel = "";
        ttsConfig.speaker = "";
        ttsConfig.conn.disconnect();
        ttsConfig.conn = null;
      } else if (args[0] == "set-voice") {
        ttsConfig.lang = args[1];
        ttsConfig.voice = args[1] + "-Wavenet-" + args[2];
        console.log(ttsConfig.voice);
        console.log(ttsConfig.lang);
      } else if (args[0] == "mine-all-day") {
        // haha yes
        ttsConfig.conn.play("audio/Mine All Day (Minecraft Music Video).mp3");
      }
    } else {
      createTTSAudio(msg.content, path => {
        ttsConfig.conn.play(path);
      });
    }
  } else if (msg.content.substring(0, 1) == "*") {
    let args = msg.content.substring(1).split(" ");

    switch (args[0]) {
      case "ping":
        let startTime = Discord.SnowflakeUtil.deconstruct(msg.id).timestamp;
        msg.channel
          .send("pong uwu")
          .then(response => {
            response.edit(
              "pong uwu: "
              + (Discord.SnowflakeUtil.deconstruct(response.id).timestamp-startTime).toString()
              + "ms"
            );
          })
          .catch(console.log);
        break;
      case "im-lonely":
        if (msg.member.voice.channel) {
          if (!ttsConfig.isUsing) {
            msg.member.voice.channel
              .join()
              .then(voiceConn => {
                ttsConfig.isUsing = true;
                ttsConfig.channel = msg.channel.id;
                ttsConfig.speaker = msg.author.id;
                ttsConfig.conn = voiceConn;
                msg.channel.send("voice channel joined");
              })
              .catch(console.log);
          } else {
            msg.reply("tts is being used by someone else and my node.js skills are nonexistent")
              .catch(console.log);
          }
        } else {
          msg.reply("you are not in a voice channel")
            .catch(console.log);
        }
        break;
      case "help":
        msg.reply("`*ping` to ping, `*im-lonely` to be less lonely")
          .catch(console.log);
        break;
      default:
        msg.reply("unknown command "+args[0])
          .catch(console.log);
    }
  }
});

discordClient.login(process.env.DISCORD_BOT_TOKEN);
