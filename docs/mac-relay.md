# Mac Relay Setup

This document outlines how to configure a small relay service on your own Mac
to send iMessages (including Memoji/sticker messages) and initiate audio
calls on behalf of the **Jason** persona.  The relay runs under your own
Apple ID; no third party provider sees your messages or credentials.

## Why a Mac relay?

Apple does not provide a public API for sending iMessages or Memoji from
servers.  By running a tiny helper on a Mac that is signed into your iCloud
account, PERSONAI can trigger messages and calls via AppleScript.  The relay
listens for a secure webhook from the Titan backend, then uses the native
`Messages` application to compose and send messages.

## Requirements

- A Mac (Mac mini, laptop, or VM) that can remain powered on and connected
  to the internet.
- The Mac must be signed into your Apple ID and have **Messages** enabled.
- [Node.js](https://nodejs.org/) installed (version 18+ recommended).
- Basic familiarity with running commands in Terminal on macOS.

## Setup Steps

1. **Prevent the Mac from sleeping**.  In System Settings → Battery or
   Energy Saver, disable “Put hard disks to sleep when possible” and enable
   “Prevent computer from sleeping automatically”.  Alternatively, run
   `caffeinate -d` in Terminal to keep the machine awake.

2. **Sign into iCloud**.  Make sure you are signed in with the Apple ID
   that should send iMessages.  Open Messages and verify that you can send
   and receive messages.

3. **Create a directory for the relay** and install dependencies:

   ```sh
   mkdir -p ~/personai-mac-relay && cd ~/personai-mac-relay
   npm init -y
   npm install express body-parser
   ```

4. **Create a file called `relay.js`** with the following contents.  This
   script starts a small Express server that listens for POST requests on
   `/send-imessage` and uses AppleScript to send the message.  The
   AppleScript is invoked via the `osascript` CLI.  Replace
   `YOUR_AUTH_TOKEN` with a long random string; this token must match the
   one configured in Titan (`STATUS_TOKEN` or a dedicated `IMESSAGE_TOKEN`).

   ```js
   const express = require('express');
   const bodyParser = require('body-parser');
   const { execFile } = require('child_process');

   const APP_PORT = process.env.RELAY_PORT || 5050;
   const AUTH_TOKEN = process.env.RELAY_TOKEN || 'YOUR_AUTH_TOKEN';

   const app = express();
   app.use(bodyParser.json());

   app.post('/send-imessage', (req, res) => {
     const token = req.headers['authorization'];
     if (!token || token !== `Bearer ${AUTH_TOKEN}`) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     const { to, text } = req.body;
     if (!to || !text) {
       return res.status(400).json({ error: 'Missing `to` or `text`' });
     }
     const script = `tell application \"Messages\"\n` +
       `  set targetService to 1st service whose service type = iMessage\n` +
       `  set targetBuddy to buddy \"${to}\" of targetService\n` +
       `  send \"${text}\" to targetBuddy\n` +
       `end tell`;
     execFile('/usr/bin/osascript', ['-e', script], (err) => {
       if (err) {
         console.error('Failed to send message', err);
         return res.status(500).json({ error: 'Failed to send message' });
       }
       res.json({ success: true });
     });
   });

   app.listen(APP_PORT, () => {
     console.log(`Mac relay listening on port ${APP_PORT}`);
   });
   ```

5. **Start the relay**:

   ```sh
   export RELAY_TOKEN=some-long-secret
   node relay.js
   ```

   Keep this process running (use [pm2](https://pm2.keymetrics.io/) or a
   launch agent for persistence).  The relay listens on `http://localhost:5050`.

6. **Expose the relay to Titan**.  To allow Titan (running on Render/Fly)
   to call the relay, you can use a tunnelling service such as
   [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/run-tunnel/) or
   [ngrok](https://ngrok.com/).  For example:

   ```sh
   # Using Cloudflare Tunnel
   cloudflared tunnel run personai-mac-relay
   ```

   The tunnelling service will output a public URL (e.g. `https://relay.example.com`).
   Set this URL in Titan’s configuration as `IMESSAGE_RELAY_URL` and set
   `RELAY_TOKEN` in the Mac environment to the same secret token.

7. **Update Titan/PersonAI configuration**.  In your `.env` file (or via
   Render environment variables) add:

   ```env
   IMESSAGE_RELAY_URL=https://relay.example.com
   IMESSAGE_RELAY_TOKEN=some-long-secret
   ```

   The Jason persona will use these values to send morning updates via the
   Mac relay.

## Notes

- **Memoji and stickers**: The above AppleScript sends plain text messages.
  To send a Memoji or sticker, you can pre-create a sticker in Messages and
  update the AppleScript to send it by using the `send` command with a file
  path to the sticker image.  Keep in mind that AppleScript support for
  sending rich content is limited and may require additional scripting.
- **Voice messages**: To send an audio file (such as Jason’s spoken
  greeting), modify the AppleScript to attach a file.  For example:

  ```applescript
  tell application \"Messages\"
    set targetService to 1st service whose service type = iMessage
    set targetBuddy to buddy \"{{your number or email}}\" of targetService
    send POSIX file "/path/to/audio.m4a" to targetBuddy
  end tell
  ```

- **Security**: Always protect your webhook endpoint with a strong token.
  Do not expose the relay on an open port without authentication.
- **Testing**: Try sending a message to yourself first to verify that the
  relay works before integrating with Titan.
