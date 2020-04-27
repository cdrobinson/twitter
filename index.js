const Twit = require('twit');
const Discord = require('discord.js');
const mongoose = require('mongoose');

const twitterSchema = new mongoose.Schema({
  profile: String,
  followParameters: [String],
  trackParameters: [String],
  feedChannelID: String
})

class Twitter {
  constructor(client) {
    this.discordClient = client;
    this.twitterClient = new Twit({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token: process.env.TWITTER_ACCESS_TOKEN_KEY,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    });
    this.twitterModel = this.discordClient.db.botDB.model('TwitterData', twitterSchema);
    this.twitterModel.findOne({profile: 'default'}).then(function(twitterParameters){
      if(twitterParameters) {
        this.follow = twitterParameters.followParameters;
        this.track = twitterParameters.trackParameters;
        this.feedChannelID = twitterParameters.feedChannelID
        if(this.follow && this.track && this.feedChannelID) {  
          if(this.discordClient.guilds.get(process.env.HOME_GUILD)) {
            this.feedChannel = this.discordClient.guilds.cache.get(process.env.HOME_GUILD).channels.get(this.feedChannelID);
          } else {
            return;
          }
          this.stream = this.twitterClient.stream('statuses/filter', {follow: this.follow, track: this.track});
          this.stream.on('tweet', function(tweetData) {
            if(!this.follow.includes(tweetData.user.id_str)) return;
            const tweetEmbed = this.parseTweet(tweetData);
            if(tweetEmbed != null) this.feedChannel.send(tweetEmbed);
          }.bind(this));
          this.stream.on('connect', (request)=>{console.log('Connecting to Twitter stream...')});
          this.stream.on('connected', (response)=>{console.log('Connected to Twitter stream!')});
          this.stream.on('reconnect', (req, res, connectInterval)=>{console.log(`Reconnecting to Twitter stream in ${connectInterval}ms...`)});
          this.stream.on('error', (error)=>{console.log(error)});
          this.stream.on('limit', (limitMessage)=>{console.log(limitMessage)});
        } else {
          if(!this.follow) console.error('Missing data for Twitter follow list');
          if(!this.track) console.error('Missing data for Twitter track list');
          if(!this.feedChannelID) console.error('Missing data for Twitter feed channel ID');
        }
      } else {
        console.error('No data found in the Twitter parameters');
      }
    }.bind(this));
  }

  parseTweet(tweetData) {
    // console.log(tweetData);
    const tweetEmbed = new Discord.RichEmbed().setColor('#1DA1F2').setTimestamp();
    const user = tweetData.user;
    const retweeted_status = tweetData.retweeted_status || null;
    const quoted_status = tweetData.quoted_status || null;
    const extended_entities = tweetData.extended_entities || null;

    //Always true values
    tweetEmbed.setAuthor('@'+user.screen_name, user.profile_image_url, 'https://twitter.com/'+user.screen_name);
    tweetEmbed.setFooter('Twitter', 'https://brandpalettes.com/wp-content/uploads/2018/02/twitter_logo-300x300.png');
    tweetEmbed.setURL('https://twitter.com/' + user.screen_name + '/status/' + tweetData.id_str);

    if(retweeted_status && !quoted_status) { //Is a retweet
      console.log('Tweet is a retweet');
      tweetEmbed.setTitle(user.name + ' just retweeted ' + retweeted_status.user.name + '\'s tweet:');
      if(retweeted_status.truncated) {
        tweetEmbed.setDescription(retweeted_status.extended_tweet.full_text);
      } else {
        tweetEmbed.setDescription(retweeted_status.text);
      }
      
    }  
    if(quoted_status && !retweeted_status){ //Quotes another tweet
      console.log('Tweet quotes another tweet');
      tweetEmbed.setTitle(user.name + ' just quoted ' + quoted_status.user.name + '\'s tweet:');
      tweetEmbed.setDescription(tweetData.text);
      if(quoted_status.truncated) {
        tweetEmbed.addField(quoted_status.user.name + '\'s original tweet:', quoted_status.extended_tweet.full_text, false);
      } else {
        tweetEmbed.addField(quoted_status.user.name + '\'s original tweet:', quoted_status.text, false);
      }
    }
    if(quoted_status && retweeted_status) { //Retweet of a quoted tweet
      console.log('Tweet is a retweet of a quoted tweet');
      tweetEmbed.setTitle(user.name + ' just retweeted ' + retweeted_status.user.name + '\'s quoted tweet:');
      if(retweeted_status.truncated) {
        tweetEmbed.setDescription(retweeted_status.extended_tweet.full_text);
      } else {
        tweetEmbed.setDescription(retweeted_status.text);
      }
      tweetEmbed.addField(
        retweeted_status.quoted_status.user.name + '\'s original tweet that ' + retweeted_status.user.name + ' quoted:',
        quoted_status.text, false);
    }
    if(tweetData.in_reply_to_screen_name) console.log('Tweet is a reply'); //Starts with a mention
    if(tweetData.entities && tweetData.entities.urls.length > 0) console.log('Tweet contains a link'); //Tweet contains a link
    if(extended_entities && extended_entities.media.length > 0) { //If the tweet contains media
      console.log('Tweet contains media');
      if(extended_entities.media[0].type == 'photo') { //If the media is a photo
        console.log('Media is a photo');
        tweetEmbed.setImage(extended_entities.media[0].media_url);
      }
      if(extended_entities.media[0].type == 'animated_gif') {
        console.log('Media is a gif');
        tweetEmbed.setImage(extended_entities.media[0].media_url);
      }
    }
    if(!retweeted_status && !quoted_status) { //Isn't a retweet nor does it quote another tweet
      console.log('Tweet is a simple tweet'); 
      tweetEmbed.setDescription(tweetData.text).setTitle(user.name + ' just tweeted:');
    }
    return tweetEmbed;
  }
}

module.exports = Twitter;