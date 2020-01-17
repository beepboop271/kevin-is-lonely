# kevin-is-lonely
# i really don't know how to do node.js properly okay read the code with that in mind

i don't really use a mic so i just sit in voice channels and listen to my friends do whatever.
sometimes when i need to talk, i'll just type into a text channel. then one day, we decided to
create a channel #kevin-is-lonely because when i sent messages to talk to people in a voice
channel it would look like i'm talking to myself. someone had the great idea of making a bot
to read messages that i sent to #kevin-is-lonely so that i could 'speak' in the voice channel,
and here it is :p\
\
uses google cloud text to speech api for those epic wavenet voices. node.js even though i don't
really know how to do all that weird async-event-loop-listeners-basically-threading-but-not stuff,
if you look at the code you can see the bot can only be speaking in one place because it was only
made with my use case in mind. maybe have a list of those tts config things and check every
message to see if it should be spoken to any of them or something?? that sounds like it would
run really poorly with many connections.. well maybe you could binary search it but still i clearly
don't know much about this web stuff. also that bug with cutting off the end of the file is gonna
slow it all down because i'm using ffmpeg to re-encode the file with silence at the end.

### stuff i'd do if i felt like it
-use the dev versions of discord.js because apparently the bug is fixed\
-find a way to play the data directly from gcloud\
-make it work with multiple connections\
note: may never do this
