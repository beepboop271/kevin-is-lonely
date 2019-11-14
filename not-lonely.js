const Discord = require('discord.js');
const auth = require('./auth.json');
const tts = require('@google-cloud/text-to-speech');
const fs = require('fs');

const client = new Discord.Client();
client.on('ready', () => {console.log('logged in');});

let usingTTS = false;
let ttsChannel = '';
let ttsSpeaker = '';
let ttsConn = null;
let fileName = 0

async function createTTSAudio(text, callback) {
  let ttsClient = new tts.TextToSpeechClient(credentials=auth.keyPath);
  let request = {
    input: {text:text},
    voice: {languageCode: 'en-US', ssmlGender: 'NEUTRAL'},
    audioConfig: {audioEncoding: 'MP3'}
  };
  let [response] = await ttsClient.synthesizeSpeech(request);
  fileName = (fileName+1)%5;
  let path = 'audio/'+String.fromCharCode(48+fileName)+'.mp3';
  fs.writeFileSync(path, response.audioContent, 'binary');
  callback(path);
}

client.on('message', async function(msg) {
  if(!msg.guild) return;
  if(usingTTS && msg.channel.id == ttsChannel && msg.author.id == ttsSpeaker) {
    if(msg.content == '*help') {
      msg.reply('`*leave` to be lonely again')
        .catch(console.log);
    } else if(msg.content == '*leave') {
      usingTTS = false;
      ttsChannel = '';
      ttsSpeaker = '';
      ttsConn.disconnect();
      ttsConn = null;
    } else {
      createTTSAudio(msg.content, path => {
        console.log(msg.content);
        const dispatcher = ttsConn.playFile(path);
        dispatcher.on('end', end => {
          console.log('hi');
        });
      });
    }
  } else if(msg.content.substring(0, 1) == '*') {
    let args = msg.content.substring(1).split(' ');
    switch(args[0]) {
      case 'ping':
        let startTime = Discord.SnowflakeUtil.deconstruct(msg.id).timestamp;
        msg.channel.send('pong uwu')
          .then(response => {
            response.edit('pong uwu: '
                          + (Discord.SnowflakeUtil.deconstruct(response.id).timestamp-startTime).toString()
                          + 'ms');
          })
          .catch(console.log);
        break;
      case 'im-lonely':
        if(msg.member.voiceChannel) {
          if(!usingTTS) {
            msg.member.voiceChannel.join()
            .then(voiceConn => {
              msg.channel.send('voice channel joined');
              usingTTS = true;
              ttsChannel = msg.channel.id;
              ttsSpeaker = msg.author.id;
              ttsConn = voiceConn;
            })
            .catch(console.log);
          } else {
            msg.reply('tts is being used by someone else and my node.js skills are nonexistent')
              .catch(console.log);
          }
        } else {
          msg.reply('you are not in a voice channel')
            .catch(console.log);
        }
        break;
      case 'help':
        msg.reply('`*ping` to ping, `*im-lonely` to be less lonely')
          .catch(console.log);
        break;
    }
  }
});

client.login(auth.discordToken);
