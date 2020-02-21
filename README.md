# @battlemanmk2/twitter

![npm](https://img.shields.io/npm/v/@battlemanmk2/twitter)

Takes Discord.js client object and returns Twitter object that will post tracked and followed keywords and accounts to the designated Discord channel. 

Requires the following environmental variables be set:
```
TWITTER_CONSUMER_KEY
TWITTER_CONSUMER_SECRET
TWITTER_ACCESS_TOKEN_KEY
TWITTER_ACCESS_TOKEN_SECRET
HOME_GUILD (guild ID number)
```

Also requires that Bot has a bot database setup in MongoDB with a twitterdatas collection containing the following fields:
1. followParameters: Array of Twitter IDs of users to follow
2. trackParameters: Array of keywords to track
3. profile: "default". Will eventually add ability to load different profiles. ie. Game-day, vacation, etc
4. feedChannelID: String of the Discord channel's ID for the tweets to be posted to

## Install

```
$ npm install @battlemanmk2/twitter
```

## Usage

```js
const Twitter = require("@battlemanmk2/twitter");
const twitter = new Twitter(discordjsClient);
//=> Connecting to Twitter stream...
//=> Connected to Twitter stream!

If an error occurs, will auto reconnect. Each time an error occurs, it will increase reconnect time by 1 minute
//=> Reconnecting to Twitter stream in 60000ms...
//=> Connecting to Twitter stream...
//=> Connected to Twitter stream!

```