const yargs = require('yargs');
const sqlite3 = require("sqlite3").verbose();
const { google } = require('googleapis');

const argv = yargs
    .options({
        vid: {
        demandOption: true,
        alias: 'v',
        describe: 'The video ID for collect live chat messages.',
        string: true
        }
    })
    .help()
    .alias('help', 'h')
    .argv;

var db = new sqlite3.Database('./liveChatMessages.db');
db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS messages(published_at TEXT, avatar TEXT, author TEXT, content TEXT)");
});

console.log(`[${getNowTime()}] 開始收集聊天室紀錄`);

const API_KEY = 'YOUTUBE_API_KEY';
let service = google.youtube('v3');

function getNowTime() {
    let timestamp = Date.now();
    let dateObj = new Date(timestamp);
    let date = ("0" + dateObj.getDate()).slice(-2);
    let month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
    let year = dateObj.getFullYear();
    let hours = ("0" + dateObj.getHours()).slice(-2);
    let minutes = ("0" + dateObj.getMinutes()).slice(-2);
    let seconds = ("0" + dateObj.getSeconds()).slice(-2);
    return year + "/" + month + "/" + date + " " + hours + ":" + minutes + ":" + seconds;
}

function formatPublishedTime(_publishedTime) {
    let dateObj = new Date(_publishedTime);
    let date = ("0" + dateObj.getDate()).slice(-2);
    let month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
    let year = dateObj.getFullYear();
    let hours = ("0" + dateObj.getHours()).slice(-2);
    let minutes = ("0" + dateObj.getMinutes()).slice(-2);
    let seconds = ("0" + dateObj.getSeconds()).slice(-2);
    return year + "/" + month + "/" + date + " " + hours + ":" + minutes + ":" + seconds;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}   

async function getLiveChatMessagesObj(_liveChatId, _nextPageToken) {
    return await service.liveChatMessages.list({
        auth: API_KEY,
        part: 'snippet,authorDetails',
        liveChatId: _liveChatId,
        pageToken: _nextPageToken
    }).then( (response) => {
        return response.data;
    }).catch( (e) => {
        return 'The API returned an error: ' + e;
    });
}

async function getLiveChatId(_videoId) {
    return await service.videos.list({
        auth: API_KEY,
        part: 'snippet,contentDetails,liveStreamingDetails',
        id: _videoId
    }).then( (response) => {
        return response.data.items[0].liveStreamingDetails.activeLiveChatId;
    }).catch( (e) => {
        return 'The API returned an error: ' + e;
    });
}

getLiveChatId(argv.vid).then(async (_liveChatId) => {
    if(_liveChatId == "The API returned an error: TypeError: Cannot read property 'liveStreamingDetails' of undefined") {
        console.log(`[${getNowTime()}] 影片不存在，請重新檢查影片ID是否正確無誤`);
        process.exit(1);
    }
    let _pollingIntervalMillis;
    let _nextPageToken;
    while(true) {
        let obj = await getLiveChatMessagesObj(_liveChatId, _nextPageToken);
        _pollingIntervalMillis = obj.pollingIntervalMillis;
        _nextPageToken = obj.nextPageToken;
        for (const [key, item] of Object.entries(obj.items)) {
            console.log(`[${formatPublishedTime(item.snippet.publishedAt)}] ${item.authorDetails.displayName}: ${item.snippet.displayMessage}`);
            db.run("INSERT INTO messages(published_at, avatar, author, content) VALUES (?, ?, ?, ?)", [formatPublishedTime(item.snippet.publishedAt), item.authorDetails.profileImageUrl, item.authorDetails.displayName, item.snippet.displayMessage]);
        }
        console.log(`[${getNowTime()}] 已更新${obj.pageInfo.resultsPerPage}筆直播聊天資料`);
        await sleep(_pollingIntervalMillis);
    }
});