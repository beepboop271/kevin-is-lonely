# kevin-is-lonely

## i really don't know how to do node.js properly okay read the code with that in mind

### update: i kinda know how to do node.js properly but still read the code with the above in mind :)

i don't really use a mic so i just sit in voice channels and listen to my friends do whatever. sometimes when i need to talk, i'll just type into a text channel. then one day, we decided to create a channel #kevin-is-lonely because when i sent messages to talk to people in a voice channel it would look like i'm talking to myself. someone had the great idea of making a bot to read messages that i sent to #kevin-is-lonely so that i could 'speak' in the voice channel, and here it is :p

uses google cloud text to speech api for those epic wavenet voices. ~~node.js even though i don't really know how to do all that weird async-event-loop-listeners-basically-threading-but-not stuff, if you look at the code you can see the bot can only be speaking in one place because it was only made with my use case in mind. maybe have a list of those tts config things and check every message to see if it should be spoken to any of them or something?? that sounds like it would run really poorly with many connections.. well maybe you could binary search it but still i clearly don't know much about this web stuff.~~ ok idk how i didn't come up with a map like what?? anyways in theory it should work across multiple servers now but i haven't been able to test that. ~~also that bug with cutting off the end of the file is gonna slow it all down because i'm using ffmpeg to re-encode the file with silence at the end.~~ now using the master branch of discord.js as it fixes that bug.

## stuff i'd do if i felt like it

- ~~use the dev versions of discord.js because apparently the bug is fixed~~ done- discord.js master branch now used
- ~~find a way to play the data directly from gcloud~~ done- convert buffers to streams
- ~~make it work with multiple connections~~ done- in theory- using map of channel->config

~~note: may never do this~~ everything is done ayy

### stuff that i didn't write down that i'd do but i ended up doing

- voice, pitch, and speed adjustments
- multiple users in the same server can be using the bot to speak  with different voices
- new messages no longer cut off the message being currently spoken, they are queued in a circular buffer and messages are not spoken if too many pending messages are in the queue

### new stuff i'd do if i felt like it

- expand acronyms so it doesn't say i d k instead of i don't know
- ???
- annoy candice to *c o n t r i b u t e* to *open* **source** ***projects*** (like this one, if u can call it a project)
- magic
- fifth list item
- not the fifth list item
