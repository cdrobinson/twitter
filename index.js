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
            this.feedChannel = this.discordClient.guilds.get(process.env.HOME_GUILD).channels.get(this.feedChannelID);
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
 
const mentionedTweet = {
  created_at: 'Tue Feb 04 18:20:07 +0000 2020',
  id: 1224759555038568400,
  id_str: '1224759555038568448',
  text: '@cdrobinson_cdr  pssst o/',
  source:
  '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
  truncated: false,
  in_reply_to_status_id: null,
  in_reply_to_status_id_str: null,
  in_reply_to_user_id: 77091379,
  in_reply_to_user_id_str: '77091379',
  in_reply_to_screen_name: 'cdrobinson_cdr',
  user:
  { id: 1036790880232005600,
    id_str: '1036790880232005632',
    name: 'Jarvis',
    screen_name: 'FrontlineJarvis',
    location: null,
    url: 'https://botsmk2.com',
    description: 'Custom @DiscordApp Bots',
    translator_type: 'none',
    protected: false,
    verified: false,
    followers_count: 4,
    friends_count: 7,
    listed_count: 0,
    favourites_count: 5,
    statuses_count: 39,
    created_at: 'Tue Sep 04 01:39:43 +0000 2018',
    utc_offset: null,
    time_zone: null,
    geo_enabled: false,
    lang: null,
    contributors_enabled: false,
    is_translator: false,
    profile_background_color: 'F5F8FA',
    profile_background_image_url: '',
    profile_background_image_url_https: '',
    profile_background_tile: false,
    profile_link_color: '1DA1F2',
    profile_sidebar_border_color: 'C0DEED',
    profile_sidebar_fill_color: 'DDEEF6',
    profile_text_color: '333333',
    profile_use_background_image: true,
    profile_image_url:
      'http://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
    profile_image_url_https:
      'https://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
    profile_banner_url:
      'https://pbs.twimg.com/profile_banners/1036790880232005632/1536025327',
    default_profile: true,
    default_profile_image: false,
    following: null,
    follow_request_sent: null,
    notifications: null },
  geo: null,
  coordinates: null,
  place: null,
  contributors: null,
  is_quote_status: false,
  quote_count: 0,
  reply_count: 0,
  retweet_count: 0,
  favorite_count: 0,
  entities:
  { hashtags: [],
    urls: [],
    user_mentions: [ [Object] ],
    symbols: [] },
  favorited: false,
  retweeted: false,
  filter_level: 'low',
  lang: 'en',
  timestamp_ms: '1580840407510' 
}

const quoteTweetExample = { 
  created_at: 'Tue Feb 04 16:55:57 +0000 2020',
  id: 1224738372511506400,
  id_str: '1224738372511506432',
  text: 'Hey you should check them out :P',
  source:
  '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
  truncated: false,
  in_reply_to_status_id: null,
  in_reply_to_status_id_str: null,
  in_reply_to_user_id: null,
  in_reply_to_user_id_str: null,
  in_reply_to_screen_name: null,
  user:
  { id: 1036790880232005600,
    id_str: '1036790880232005632',
    name: 'Jarvis',
    screen_name: 'FrontlineJarvis',
    location: null,
    url: 'https://botsmk2.com',
    description: 'Custom @DiscordApp Bots',
    translator_type: 'none',
    protected: false,
    verified: false,
    followers_count: 3,
    friends_count: 7,
    listed_count: 0,
    favourites_count: 5,
    statuses_count: 38,
    created_at: 'Tue Sep 04 01:39:43 +0000 2018',
    utc_offset: null,
    time_zone: null,
    geo_enabled: false,
    lang: null,
    contributors_enabled: false,
    is_translator: false,
    profile_background_color: 'F5F8FA',
    profile_background_image_url: '',
    profile_background_image_url_https: '',
    profile_background_tile: false,
    profile_link_color: '1DA1F2',
    profile_sidebar_border_color: 'C0DEED',
    profile_sidebar_fill_color: 'DDEEF6',
    profile_text_color: '333333',
    profile_use_background_image: true,
    profile_image_url:
      'http://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
    profile_image_url_https:
      'https://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
    profile_banner_url:
      'https://pbs.twimg.com/profile_banners/1036790880232005632/1536025327',
    default_profile: true,
    default_profile_image: false,
    following: null,
    follow_request_sent: null,
    notifications: null },
  geo: null,
  coordinates: null,
  place: null,
  contributors: null,
  quoted_status_id: 965408844540207100,
  quoted_status_id_str: '965408844540207104',
  quoted_status:
  { created_at: 'Mon Feb 19 02:12:59 +0000 2018',
    id: 965408844540207100,
    id_str: '965408844540207104',
    text:
      'Join us on other platforms to get involved with our community!\n@discordapp: https://t.co/YAaeHKunpI\n@facebook:… https://t.co/GrhQzE5kYQ',
    source:
      '<a href="http://twitter.com" rel="nofollow">Twitter Web Client</a>',
    truncated: true,
    in_reply_to_status_id: null,
    in_reply_to_status_id_str: null,
    in_reply_to_user_id: null,
    in_reply_to_user_id_str: null,
    in_reply_to_screen_name: null,
    user:
      { id: 783104125772845000,
        id_str: '783104125772845057',
        name: 'Cardinal Esports',
        screen_name: 'bsuesports',
        location: 'Muncie, IN',
        url: 'https://www.twitch.tv/cardinalesports',
        description:
        'Ball State University\'s Esports Teams. Follow us for news on streams, events, and much more! #ChirpChirp',
        translator_type: 'none',
        protected: false,
        verified: false,
        followers_count: 287,
        friends_count: 160,
        listed_count: 1,
        favourites_count: 618,
        statuses_count: 359,
        created_at: 'Tue Oct 04 00:39:07 +0000 2016',
        utc_offset: null,
        time_zone: null,
        geo_enabled: false,
        lang: null,
        contributors_enabled: false,
        is_translator: false,
        profile_background_color: '000000',
        profile_background_image_url: 'http://abs.twimg.com/images/themes/theme1/bg.png',
        profile_background_image_url_https: 'https://abs.twimg.com/images/themes/theme1/bg.png',
        profile_background_tile: false,
        profile_link_color: 'BA0C2F',
        profile_sidebar_border_color: '000000',
        profile_sidebar_fill_color: '000000',
        profile_text_color: '000000',
        profile_use_background_image: false,
        profile_image_url:
        'http://pbs.twimg.com/profile_images/1220016286194962432/dfs4vhAT_normal.jpg',
        profile_image_url_https:
        'https://pbs.twimg.com/profile_images/1220016286194962432/dfs4vhAT_normal.jpg',
        profile_banner_url:
        'https://pbs.twimg.com/profile_banners/783104125772845057/1579709546',
        default_profile: false,
        default_profile_image: false,
        following: null,
        follow_request_sent: null,
        notifications: null },
    geo: null,
    coordinates: null,
    place: null,
    contributors: null,
    is_quote_status: false,
    extended_tweet:
      { full_text:
        'Join us on other platforms to get involved with our community!\n@discordapp: https://t.co/YAaeHKunpI\n@facebook: https://t.co/9vS5ZT5ICK\n@instagram: https://t.co/UDImyX814Y',
        display_text_range: [Array],
        entities: [Object] },
    quote_count: 1,
    reply_count: 0,
    retweet_count: 2,
    favorite_count: 5,
    entities:
      { hashtags: [],
        urls: [Array],
        user_mentions: [Array],
        symbols: [] },
    favorited: false,
    retweeted: false,
    possibly_sensitive: false,
    filter_level: 'low',
    lang: 'en' },
  quoted_status_permalink:
  { url: 'https://t.co/GHBU6Y2Vep',
    expanded: 'https://twitter.com/bsuesports/status/965408844540207104',
    display: 'twitter.com/bsuesports/sta…' },
  is_quote_status: true,
  quote_count: 0,
  reply_count: 0,
  retweet_count: 0,
  favorite_count: 0,
  entities: { hashtags: [], urls: [], user_mentions: [], symbols: [] },
  favorited: false,
  retweeted: false,
  filter_level: 'low',
  lang: 'en',
  timestamp_ms: '1580835357202' 
}

const retweetWithQuoteExample = {
  created_at: 'Tue Feb 04 16:22:57 +0000 2020',
  id: 1224730067193991200,
  id_str: '1224730067193991176',
  text:
   'RT @bsuesports: Check out this awesome article about our esports professional speaker event with @InVerumGaming! He\'s the 🐐 https://t.co/8h…',
  source:
   '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
  truncated: false,
  in_reply_to_status_id: null,
  in_reply_to_status_id_str: null,
  in_reply_to_user_id: null,
  in_reply_to_user_id_str: null,
  in_reply_to_screen_name: null,
  user:
   { id: 1036790880232005600,
     id_str: '1036790880232005632',
     name: 'Jarvis',
     screen_name: 'FrontlineJarvis',
     location: null,
     url: 'https://botsmk2.com',
     description: 'Custom @DiscordApp Bots',
     translator_type: 'none',
     protected: false,
     verified: false,
     followers_count: 3,
     friends_count: 7,
     listed_count: 0,
     favourites_count: 4,
     statuses_count: 30,
     created_at: 'Tue Sep 04 01:39:43 +0000 2018',
     utc_offset: null,
     time_zone: null,
     geo_enabled: false,
     lang: null,
     contributors_enabled: false,
     is_translator: false,
     profile_background_color: 'F5F8FA',
     profile_background_image_url: '',
     profile_background_image_url_https: '',
     profile_background_tile: false,
     profile_link_color: '1DA1F2',
     profile_sidebar_border_color: 'C0DEED',
     profile_sidebar_fill_color: 'DDEEF6',
     profile_text_color: '333333',
     profile_use_background_image: true,
     profile_image_url:
      'http://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
     profile_image_url_https:
      'https://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
     profile_banner_url:
      'https://pbs.twimg.com/profile_banners/1036790880232005632/1536025327',
     default_profile: true,
     default_profile_image: false,
     following: null,
     follow_request_sent: null,
     notifications: null },
  geo: null,
  coordinates: null,
  place: null,
  contributors: null,
  retweeted_status:
   { created_at: 'Mon Feb 03 21:12:17 +0000 2020',
     id: 1224440495348125700,
     id_str: '1224440495348125696',
     text:
      'Check out this awesome article about our esports professional speaker event with @InVerumGaming! He\'s the 🐐 https://t.co/8hPRirOluO',
     display_text_range: [ 0, 107 ],
     source:
      '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
     truncated: false,
     in_reply_to_status_id: null,
     in_reply_to_status_id_str: null,
     in_reply_to_user_id: null,
     in_reply_to_user_id_str: null,
     in_reply_to_screen_name: null,
     user:
      { id: 783104125772845000,
        id_str: '783104125772845057',
        name: 'Cardinal Esports',
        screen_name: 'bsuesports',
        location: 'Muncie, IN',
        url: 'https://www.twitch.tv/cardinalesports',
        description:
         'Ball State University\'s Esports Teams. Follow us for news on streams, events, and much more! #ChirpChirp',
        translator_type: 'none',
        protected: false,
        verified: false,
        followers_count: 287,
        friends_count: 160,
        listed_count: 1,
        favourites_count: 617,
        statuses_count: 359,
        created_at: 'Tue Oct 04 00:39:07 +0000 2016',
        utc_offset: null,
        time_zone: null,
        geo_enabled: false,
        lang: null,
        contributors_enabled: false,
        is_translator: false,
        profile_background_color: '000000',
        profile_background_image_url: 'http://abs.twimg.com/images/themes/theme1/bg.png',
        profile_background_image_url_https: 'https://abs.twimg.com/images/themes/theme1/bg.png',
        profile_background_tile: false,
        profile_link_color: 'BA0C2F',
        profile_sidebar_border_color: '000000',
        profile_sidebar_fill_color: '000000',
        profile_text_color: '000000',
        profile_use_background_image: false,
        profile_image_url:
         'http://pbs.twimg.com/profile_images/1220016286194962432/dfs4vhAT_normal.jpg',
        profile_image_url_https:
         'https://pbs.twimg.com/profile_images/1220016286194962432/dfs4vhAT_normal.jpg',
        profile_banner_url:
         'https://pbs.twimg.com/profile_banners/783104125772845057/1579709546',
        default_profile: false,
        default_profile_image: false,
        following: null,
        follow_request_sent: null,
        notifications: null },
     geo: null,
     coordinates: null,
     place: null,
     contributors: null,
     quoted_status_id: 1224407271872106500,
     quoted_status_id_str: '1224407271872106496',
     quoted_status:
      { created_at: 'Mon Feb 03 19:00:16 +0000 2020',
        id: 1224407271872106500,
        id_str: '1224407271872106496',
        text:
         'If you are feeling burnt out from Super Bowl sunday, check out one of Byte\'s recent esports articles on ESL produce… https://t.co/uQONyhOsse',
        source:
         '<a href="https://www.hootsuite.com" rel="nofollow">Hootsuite Inc.</a>',
        truncated: true,
        in_reply_to_status_id: null,
        in_reply_to_status_id_str: null,
        in_reply_to_user_id: null,
        in_reply_to_user_id_str: null,
        in_reply_to_screen_name: null,
        user: [Object],
        geo: null,
        coordinates: null,
        place: null,
        contributors: null,
        is_quote_status: false,
        extended_tweet: [Object],
        quote_count: 1,
        reply_count: 0,
        retweet_count: 0,
        favorite_count: 8,
        entities: [Object],
        favorited: false,
        retweeted: false,
        possibly_sensitive: false,
        filter_level: 'low',
        lang: 'en' },
     quoted_status_permalink:
      { url: 'https://t.co/8hPRirOluO',
        expanded: 'https://twitter.com/ByteBSU/status/1224407271872106496',
        display: 'twitter.com/ByteBSU/status…' },
     is_quote_status: true,
     quote_count: 0,
     reply_count: 0,
     retweet_count: 4,
     favorite_count: 8,
     entities:
      { hashtags: [],
        urls: [Array],
        user_mentions: [Array],
        symbols: [] },
     favorited: false,
     retweeted: false,
     possibly_sensitive: false,
     filter_level: 'low',
     lang: 'en' },
  quoted_status_id: 1224407271872106500,
  quoted_status_id_str: '1224407271872106496',
  quoted_status:
   { created_at: 'Mon Feb 03 19:00:16 +0000 2020',
     id: 1224407271872106500,
     id_str: '1224407271872106496',
     text:
      'If you are feeling burnt out from Super Bowl sunday, check out one of Byte\'s recent esports articles on ESL produce… https://t.co/uQONyhOsse',
     source:
      '<a href="https://www.hootsuite.com" rel="nofollow">Hootsuite Inc.</a>',
     truncated: true,
     in_reply_to_status_id: null,
     in_reply_to_status_id_str: null,
     in_reply_to_user_id: null,
     in_reply_to_user_id_str: null,
     in_reply_to_screen_name: null,
     user:
      { id: 1724253158,
        id_str: '1724253158',
        name: 'Byte',
        screen_name: 'ByteBSU',
        location: 'Ball State University',
        url: 'http://bytebsu.com',
        description:
         'Reporting on the latest entertainment, tech, and cultural trends.',
        translator_type: 'none',
        protected: false,
        verified: false,
        followers_count: 474,
        friends_count: 293,
        listed_count: 11,
        favourites_count: 686,
        statuses_count: 5091,
        created_at: 'Tue Sep 03 03:30:19 +0000 2013',
        utc_offset: null,
        time_zone: null,
        geo_enabled: true,
        lang: null,
        contributors_enabled: false,
        is_translator: false,
        profile_background_color: '000000',
        profile_background_image_url: 'http://abs.twimg.com/images/themes/theme9/bg.gif',
        profile_background_image_url_https: 'https://abs.twimg.com/images/themes/theme9/bg.gif',
        profile_background_tile: false,
        profile_link_color: '77797F',
        profile_sidebar_border_color: '000000',
        profile_sidebar_fill_color: '000000',
        profile_text_color: '000000',
        profile_use_background_image: false,
        profile_image_url:
         'http://pbs.twimg.com/profile_images/1145696995660767233/Sp6iBH_Q_normal.jpg',
        profile_image_url_https:
         'https://pbs.twimg.com/profile_images/1145696995660767233/Sp6iBH_Q_normal.jpg',
        profile_banner_url:
         'https://pbs.twimg.com/profile_banners/1724253158/1537823992',
        default_profile: false,
        default_profile_image: false,
        following: null,
        follow_request_sent: null,
        notifications: null },
     geo: null,
     coordinates: null,
     place: null,
     contributors: null,
     is_quote_status: false,
     extended_tweet:
      { full_text:
         'If you are feeling burnt out from Super Bowl sunday, check out one of Byte\'s recent esports articles on ESL producer and caster @InVerumGaming speaking with @bsuesports on hosting tournaments across the globe.\n\nhttps://t.co/nb5wYtBZ0w',
        display_text_range: [Array],
        entities: [Object] },
     quote_count: 1,
     reply_count: 0,
     retweet_count: 0,
     favorite_count: 8,
     entities:
      { hashtags: [], urls: [Array], user_mentions: [], symbols: [] },
     favorited: false,
     retweeted: false,
     possibly_sensitive: false,
     filter_level: 'low',
     lang: 'en' },
  quoted_status_permalink:
   { url: 'https://t.co/8hPRirOluO',
     expanded: 'https://twitter.com/ByteBSU/status/1224407271872106496',
     display: 'twitter.com/ByteBSU/status…' },
  is_quote_status: true,
  quote_count: 0,
  reply_count: 0,
  retweet_count: 0,
  favorite_count: 0,
  entities:
   { hashtags: [],
     urls: [],
     user_mentions: [ [Object], [Object] ],
     symbols: [] },
  favorited: false,
  retweeted: false,
  filter_level: 'low',
  lang: 'en',
  timestamp_ms: '1580833377060' 
}

const retweetOfQuotedTweet = {
  created_at: 'Wed Feb 05 18:56:46 +0000 2020',
  id: 1225131166401007600,
  id_str: '1225131166401007616',
  text:
  'RT @bsuesports: Can’t wait with be back with our lovely boys ❤️ tune in on twitch this Saturday for round 3 #ChirpChirp #League_of_Legends…',
  source:
  '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
  truncated: false,
  in_reply_to_status_id: null,
  in_reply_to_status_id_str: null,
  in_reply_to_user_id: null,
  in_reply_to_user_id_str: null,
  in_reply_to_screen_name: null,
  user:
  { id: 1036790880232005600,
    id_str: '1036790880232005632',
    name: 'Jarvis',
    screen_name: 'FrontlineJarvis',
    location: null,
    url: 'https://botsmk2.com',
    description: 'Custom @DiscordApp Bots',
    translator_type: 'none',
    protected: false,
    verified: false,
    followers_count: 4,
    friends_count: 8,
    listed_count: 0,
    favourites_count: 9,
    statuses_count: 83,
    created_at: 'Tue Sep 04 01:39:43 +0000 2018',
    utc_offset: null,
    time_zone: null,
    geo_enabled: false,
    lang: null,
    contributors_enabled: false,
    is_translator: false,
    profile_background_color: 'F5F8FA',
    profile_background_image_url: '',
    profile_background_image_url_https: '',
    profile_background_tile: false,
    profile_link_color: '1DA1F2',
    profile_sidebar_border_color: 'C0DEED',
    profile_sidebar_fill_color: 'DDEEF6',
    profile_text_color: '333333',
    profile_use_background_image: true,
    profile_image_url:
      'http://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
    profile_image_url_https:
      'https://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
    profile_banner_url:
      'https://pbs.twimg.com/profile_banners/1036790880232005632/1536025327',
    default_profile: true,
    default_profile_image: false,
    following: null,
    follow_request_sent: null,
    notifications: null },
  geo: null,
  coordinates: null,
  place: null,
  contributors: null,
  retweeted_status:
  { created_at: 'Wed Feb 05 15:52:55 +0000 2020',
    id: 1225084899952074800,
    id_str: '1225084899952074752',
    text:
      'Can’t wait with be back with our lovely boys ❤️ tune in on twitch this Saturday for round 3 #ChirpChirp… https://t.co/SnPqn7daAq',
    display_text_range: [ 0, 140 ],
    source:
      '<a href="http://twitter.com/download/iphone" rel="nofollow">Twitter for iPhone</a>',
    truncated: true,
    in_reply_to_status_id: null,
    in_reply_to_status_id_str: null,
    in_reply_to_user_id: null,
    in_reply_to_user_id_str: null,
    in_reply_to_screen_name: null,
    user:
      { id: 783104125772845000,
        id_str: '783104125772845057',
        name: 'Cardinal Esports',
        screen_name: 'bsuesports',
        location: 'Muncie, IN',
        url: 'https://www.twitch.tv/cardinalesports',
        description:
        'Ball State University\'s Esports Teams. Follow us for news on streams, events, and much more! #ChirpChirp',
        translator_type: 'none',
        protected: false,
        verified: false,
        followers_count: 291,
        friends_count: 164,
        listed_count: 1,
        favourites_count: 632,
        statuses_count: 364,
        created_at: 'Tue Oct 04 00:39:07 +0000 2016',
        utc_offset: null,
        time_zone: null,
        geo_enabled: true,
        lang: null,
        contributors_enabled: false,
        is_translator: false,
        profile_background_color: '000000',
        profile_background_image_url: 'http://abs.twimg.com/images/themes/theme1/bg.png',
        profile_background_image_url_https: 'https://abs.twimg.com/images/themes/theme1/bg.png',
        profile_background_tile: false,
        profile_link_color: 'BA0C2F',
        profile_sidebar_border_color: '000000',
        profile_sidebar_fill_color: '000000',
        profile_text_color: '000000',
        profile_use_background_image: false,
        profile_image_url:
        'http://pbs.twimg.com/profile_images/1220016286194962432/dfs4vhAT_normal.jpg',
        profile_image_url_https:
        'https://pbs.twimg.com/profile_images/1220016286194962432/dfs4vhAT_normal.jpg',
        profile_banner_url:
        'https://pbs.twimg.com/profile_banners/783104125772845057/1579709546',
        default_profile: false,
        default_profile_image: false,
        following: null,
        follow_request_sent: null,
        notifications: null },
    geo: null,
    coordinates: null,
    place: null,
    contributors: null,
    quoted_status_id: 1225076585675530200,
    quoted_status_id_str: '1225076585675530240',
    quoted_status:
      { created_at: 'Wed Feb 05 15:19:53 +0000 2020',
        id: 1225076585675530200,
        id_str: '1225076585675530240',
        text:
        'When you realize you have to wait until Saturday for more @ESC_Conference action... https://t.co/APUyRYlJg8',
        display_text_range: [Array],
        source:
        '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
        truncated: false,
        in_reply_to_status_id: null,
        in_reply_to_status_id_str: null,
        in_reply_to_user_id: null,
        in_reply_to_user_id_str: null,
        in_reply_to_screen_name: null,
        user: [Object],
        geo: null,
        coordinates: null,
        place: null,
        contributors: null,
        is_quote_status: false,
        quote_count: 2,
        reply_count: 0,
        retweet_count: 2,
        favorite_count: 8,
        entities: [Object],
        extended_entities: [Object],
        favorited: false,
        retweeted: false,
        possibly_sensitive: false,
        filter_level: 'low',
        lang: 'en' },
    quoted_status_permalink:
      { url: 'https://t.co/OFYs6wPpqv',
        expanded:
        'https://twitter.com/ethanjdahlen/status/1225076585675530240',
        display: 'twitter.com/ethanjdahlen/s…' },
    is_quote_status: true,
    extended_tweet:
      { full_text:
        'Can’t wait with be back with our lovely boys ❤️ tune in on twitch this Saturday for round 3 #ChirpChirp #League_of_Legends https://t.co/OFYs6wPpqv',
        display_text_range: [Array],
        entities: [Object] },
    quote_count: 0,
    reply_count: 0,
    retweet_count: 2,
    favorite_count: 5,
    entities:
      { hashtags: [Array],
        urls: [Array],
        user_mentions: [],
        symbols: [] },
    favorited: false,
    retweeted: false,
    possibly_sensitive: false,
    filter_level: 'low',
    lang: 'en' },
  quoted_status_id: 1225076585675530200,
  quoted_status_id_str: '1225076585675530240',
  quoted_status:
  { created_at: 'Wed Feb 05 15:19:53 +0000 2020',
    id: 1225076585675530200,
    id_str: '1225076585675530240',
    text:
      'When you realize you have to wait until Saturday for more @ESC_Conference action... https://t.co/APUyRYlJg8',
    display_text_range: [ 0, 83 ],
    source:
      '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
    truncated: false,
    in_reply_to_status_id: null,
    in_reply_to_status_id_str: null,
    in_reply_to_user_id: null,
    in_reply_to_user_id_str: null,
    in_reply_to_screen_name: null,
    user:
      { id: 4477068142,
        id_str: '4477068142',
        name: 'Ethan Dahlen',
        screen_name: 'ethanjdahlen',
        location: 'Muncie, IN',
        url: null,
        description:
        'BSU, CSL. Cardinal Esports. Probably yelling about sports right now. 🏐🏐🏐\n\n(Sports talk show host and Play by play talent for traditional sports and esports.)',
        translator_type: 'none',
        protected: false,
        verified: false,
        followers_count: 43,
        friends_count: 167,
        listed_count: 0,
        favourites_count: 236,
        statuses_count: 124,
        created_at: 'Mon Dec 14 03:33:50 +0000 2015',
        utc_offset: null,
        time_zone: null,
        geo_enabled: false,
        lang: null,
        contributors_enabled: false,
        is_translator: false,
        profile_background_color: 'F5F8FA',
        profile_background_image_url: '',
        profile_background_image_url_https: '',
        profile_background_tile: false,
        profile_link_color: '1DA1F2',
        profile_sidebar_border_color: 'C0DEED',
        profile_sidebar_fill_color: 'DDEEF6',
        profile_text_color: '333333',
        profile_use_background_image: true,
        profile_image_url:
        'http://pbs.twimg.com/profile_images/1224214977940160513/jAEbFTA4_normal.jpg',
        profile_image_url_https:
        'https://pbs.twimg.com/profile_images/1224214977940160513/jAEbFTA4_normal.jpg',
        profile_banner_url:
        'https://pbs.twimg.com/profile_banners/4477068142/1518563282',
        default_profile: true,
        default_profile_image: false,
        following: null,
        follow_request_sent: null,
        notifications: null },
    geo: null,
    coordinates: null,
    place: null,
    contributors: null,
    is_quote_status: false,
    quote_count: 2,
    reply_count: 0,
    retweet_count: 2,
    favorite_count: 8,
    entities:
      { hashtags: [],
        urls: [],
        user_mentions: [Array],
        symbols: [],
        media: [Array] },
    extended_entities: { media: [Array] },
    favorited: false,
    retweeted: false,
    possibly_sensitive: false,
    filter_level: 'low',
    lang: 'en' },
  quoted_status_permalink:
  { url: 'https://t.co/OFYs6wPpqv',
    expanded:
      'https://twitter.com/ethanjdahlen/status/1225076585675530240',
    display: 'twitter.com/ethanjdahlen/s…' },
  is_quote_status: true,
  quote_count: 0,
  reply_count: 0,
  retweet_count: 0,
  favorite_count: 0,
  entities:
  { hashtags: [ [Object], [Object] ],
    urls: [],
    user_mentions: [ [Object] ],
    symbols: [] },
  favorited: false,
  retweeted: false,
  filter_level: 'low',
  lang: 'en',
  timestamp_ms: '1580929006563' 
}

const tweetWithHashtag = { 
  created_at: 'Tue Feb 04 16:34:23 +0000 2020',
  id: 1224732945853878300,
  id_str: '1224732945853878277',
  text: 'This is just a normal tweet with #hashtags',
  source:
  '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
  truncated: false,
  in_reply_to_status_id: null,
  in_reply_to_status_id_str: null,
  in_reply_to_user_id: null,
  in_reply_to_user_id_str: null,
  in_reply_to_screen_name: null,
  user:
  { id: 1036790880232005600,
    id_str: '1036790880232005632',
    name: 'Jarvis',
    screen_name: 'FrontlineJarvis',
    location: null,
    url: 'https://botsmk2.com',
    description: 'Custom @DiscordApp Bots',
    translator_type: 'none',
    protected: false,
    verified: false,
    followers_count: 3,
    friends_count: 7,
    listed_count: 0,
    favourites_count: 4,
    statuses_count: 31,
    created_at: 'Tue Sep 04 01:39:43 +0000 2018',
    utc_offset: null,
    time_zone: null,
    geo_enabled: false,
    lang: null,
    contributors_enabled: false,
    is_translator: false,
    profile_background_color: 'F5F8FA',
    profile_background_image_url: '',
    profile_background_image_url_https: '',
    profile_background_tile: false,
    profile_link_color: '1DA1F2',
    profile_sidebar_border_color: 'C0DEED',
    profile_sidebar_fill_color: 'DDEEF6',
    profile_text_color: '333333',
    profile_use_background_image: true,
    profile_image_url:
      'http://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
    profile_image_url_https:
      'https://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
    profile_banner_url:
      'https://pbs.twimg.com/profile_banners/1036790880232005632/1536025327',
    default_profile: true,
    default_profile_image: false,
    following: null,
    follow_request_sent: null,
    notifications: null },
  geo: null,
  coordinates: null,
  place: null,
  contributors: null,
  is_quote_status: false,
  quote_count: 0,
  reply_count: 0,
  retweet_count: 0,
  favorite_count: 0,
  entities:
  { hashtags: [ [Object] ],
    urls: [],
    user_mentions: [],
    symbols: [] },
  favorited: false,
  retweeted: false,
  filter_level: 'low',
  lang: 'en',
  timestamp_ms: '1580834063386' 
}

const quotedTweetWithMedia = {
  created_at: 'Wed Feb 05 15:52:55 +0000 2020',
  id: 1225084899952074800,
  id_str: '1225084899952074752',
  text:
  'Can’t wait with be back with our lovely boys ❤️ tune in on twitch this Saturday for round 3 #ChirpChirp… https://t.co/SnPqn7daAq',
  source:
  '<a href="http://twitter.com/download/iphone" rel="nofollow">Twitter for iPhone</a>',
  truncated: true,
  in_reply_to_status_id: null,
  in_reply_to_status_id_str: null,
  in_reply_to_user_id: null,
  in_reply_to_user_id_str: null,
  in_reply_to_screen_name: null,
  user:
  { id: 783104125772845000,
    id_str: '783104125772845057',
    name: 'Cardinal Esports',
    screen_name: 'bsuesports',
    location: 'Muncie, IN',
    url: 'https://www.twitch.tv/cardinalesports',
    description:
      'Ball State University\'s Esports Teams. Follow us for news on streams, events, and much more! #ChirpChirp',
    translator_type: 'none',
    protected: false,
    verified: false,
    followers_count: 290,
    friends_count: 164,
    listed_count: 1,
    favourites_count: 628,
    statuses_count: 363,
    created_at: 'Tue Oct 04 00:39:07 +0000 2016',
    utc_offset: null,
    time_zone: null,
    geo_enabled: false,
    lang: null,
    contributors_enabled: false,
    is_translator: false,
    profile_background_color: '000000',
    profile_background_image_url: 'http://abs.twimg.com/images/themes/theme1/bg.png',
    profile_background_image_url_https: 'https://abs.twimg.com/images/themes/theme1/bg.png',
    profile_background_tile: false,
    profile_link_color: 'BA0C2F',
    profile_sidebar_border_color: '000000',
    profile_sidebar_fill_color: '000000',
    profile_text_color: '000000',
    profile_use_background_image: false,
    profile_image_url:
      'http://pbs.twimg.com/profile_images/1220016286194962432/dfs4vhAT_normal.jpg',
    profile_image_url_https:
      'https://pbs.twimg.com/profile_images/1220016286194962432/dfs4vhAT_normal.jpg',
    profile_banner_url:
      'https://pbs.twimg.com/profile_banners/783104125772845057/1579709546',
    default_profile: false,
    default_profile_image: false,
    following: null,
    follow_request_sent: null,
    notifications: null },
  geo: null,
  coordinates: null,
  place: null,
  contributors: null,
  quoted_status_id: 1225076585675530200,
  quoted_status_id_str: '1225076585675530240',
  quoted_status:
  { created_at: 'Wed Feb 05 15:19:53 +0000 2020',
    id: 1225076585675530200,
    id_str: '1225076585675530240',
    text:
      'When you realize you have to wait until Saturday for more @ESC_Conference action... https://t.co/APUyRYlJg8',
    display_text_range: [Array],
    source:
      '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
    truncated: false,
    in_reply_to_status_id: null,
    in_reply_to_status_id_str: null,
    in_reply_to_user_id: null,
    in_reply_to_user_id_str: null,
    in_reply_to_screen_name: null,
    user: [Object],
    geo: null,
    coordinates: null,
    place: null,
    contributors: null,
    is_quote_status: false,
    quote_count: 2,
    reply_count: 0,
    retweet_count: 1,
    favorite_count: 4,
    entities: [Object],
    extended_entities: [Object],
    favorited: false,
    retweeted: false,
    possibly_sensitive: false,
    filter_level: 'low',
    lang: 'en' },
  quoted_status_permalink:
  { url: 'https://t.co/OFYs6wPpqv',
    expanded:
      'https://twitter.com/ethanjdahlen/status/1225076585675530240',
    display: 'twitter.com/ethanjdahlen/s…' },
  is_quote_status: true,
  extended_tweet:
  { full_text:
      'Can’t wait with be back with our lovely boys ❤️ tune in on twitch this Saturday for round 3 #ChirpChirp #League_of_Legends',
    display_text_range: [Array],
    entities: [Object] },
  quote_count: 0,
  reply_count: 0,
  retweet_count: 0,
  favorite_count: 0,
  entities:
  { hashtags: [Array],
    urls: [Array],
    user_mentions: [],
    symbols: [] },
  favorited: false,
  retweeted: false,
  filter_level: 'low',
  lang: 'en',
  timestamp_ms: '1580917975782' 
}

const tweetWithPhoto = { 
  created_at: 'Wed Feb 05 14:55:32 +0000 2020',
  id: 1225070458938241000,
  id_str: '1225070458938241024',
  text:
  'Wait, take two, forgot to uncomment something :sweatsmile: https://t.co/Dj5MgVQJqj',
  display_text_range: [ 0, 58 ],
  source:
  '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
  truncated: false,
  in_reply_to_status_id: null,
  in_reply_to_status_id_str: null,
  in_reply_to_user_id: null,
  in_reply_to_user_id_str: null,
  in_reply_to_screen_name: null,
  user:
  { id: 1036790880232005600,
    id_str: '1036790880232005632',
    name: 'Jarvis',
    screen_name: 'FrontlineJarvis',
    location: null,
    url: 'https://botsmk2.com',
    description: 'Custom @DiscordApp Bots',
    translator_type: 'none',
    protected: false,
    verified: false,
    followers_count: 4,
    friends_count: 7,
    listed_count: 0,
    favourites_count: 6,
    statuses_count: 64,
    created_at: 'Tue Sep 04 01:39:43 +0000 2018',
    utc_offset: null,
    time_zone: null,
    geo_enabled: false,
    lang: null,
    contributors_enabled: false,
    is_translator: false,
    profile_background_color: 'F5F8FA',
    profile_background_image_url: '',
    profile_background_image_url_https: '',
    profile_background_tile: false,
    profile_link_color: '1DA1F2',
    profile_sidebar_border_color: 'C0DEED',
    profile_sidebar_fill_color: 'DDEEF6',
    profile_text_color: '333333',
    profile_use_background_image: true,
    profile_image_url:
      'http://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
    profile_image_url_https:
      'https://pbs.twimg.com/profile_images/1036791443963039744/eQVPNfk__normal.jpg',
    profile_banner_url:
      'https://pbs.twimg.com/profile_banners/1036790880232005632/1536025327',
    default_profile: true,
    default_profile_image: false,
    following: null,
    follow_request_sent: null,
    notifications: null },
  geo: null,
  coordinates: null,
  place: null,
  contributors: null,
  is_quote_status: false,
  quote_count: 0,
  reply_count: 0,
  retweet_count: 0,
  favorite_count: 0,
  entities:
  { hashtags: [],
    urls: [],
    user_mentions: [],
    symbols: [],
    media: [ [Object] ] },
  extended_entities: { media: [ [Object] ] },
  favorited: false,
  retweeted: false,
  possibly_sensitive: false,
  filter_level: 'low',
  lang: 'en',
  timestamp_ms: '1580914532776' 
}

const entitiesMediaObject = [{ 
  id: 1225071384298168300,
  id_str: '1225071384298168320',
  indices: [ 25, 48 ],
  media_url: 'http://pbs.twimg.com/media/EQBT7u2WoAACRQR.png',
  media_url_https: 'https://pbs.twimg.com/media/EQBT7u2WoAACRQR.png',
  url: 'https://t.co/1lZZr5ztW7',
  display_url: 'pic.twitter.com/1lZZr5ztW7',
  expanded_url:
   'https://twitter.com/FrontlineJarvis/status/1225071387607543808/photo/1',
  type: 'photo',
  sizes:
   { medium: [Object],
     small: [Object],
     large: [Object],
     thumb: [Object] 
    } 
  }]