const sqlite3 = require("sqlite3").verbose();
const cp = require('child_process');
const io = require('../socket').getio();
var express = require('express');
var router = express.Router();

var db = new sqlite3.Database('./liveChatMessages.db');
db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS messages(published_at TEXT, avatar TEXT, author TEXT, content TEXT)");
});

var keyword_db = new sqlite3.Database('./Keyword.db');
keyword_db.serialize(function() {
    keyword_db.run("CREATE TABLE IF NOT EXISTS keywords(id INTEGER PRIMARY KEY AUTOINCREMENT, keyword TEXT)");
});

let vid;
let child;

router.get('/liveChat/', function(req, res, next) {
    if(child == null)
        res.json({"code": -1, "running_stats": false, "msg": "未曾創立過收集聊天訊息的子程序，請先建立"});
    else
        if(child.killed || child.exitCode != null)
            res.json({"code": 0, "running_stats": false, "vid": null, "msg": "成功取得子程序執行狀態"});
        else
            res.json({"code": 0, "running_stats": true, "vid": vid, "msg": "成功取得子程序執行狀態"});
});

router.post('/liveChat/:vid', function(req, res, next) {
    vid = req.params.vid;
    if(req.params.vid == undefined || req.params.vid == "") {
        res.status(400).json({"code": -1, "msg": "未指定影片ID"});
    }
    else {
        if(child != null && !(child.killed || child.exitCode != null)) {
            res.status(400).json({"code": -1, "msg": "上個子程序未成功終止，請先終止子程序"});
        }
        else {
            child = cp.spawn('node', ['youtube_livechat_collector.js', '-v', req.params.vid]);

            child.stdout.on('data', function (data) {
                io.emit("child_stdout", data.toString());
            });

            child.stderr.on('data', function(data) {
                io.emit("child_stderr", data.toString());
            });

            child.on('close', () => {
                io.emit("child_close", "子程序已終止!\n");
            });

            res.json({"code": 0, "msg": "已成功啟動，開始收集聊天訊息"});
        }
    }
});

router.delete('/liveChat/', function(req, res, next) {
    if(child == null) {
        res.json({"code": -1, "stats": null, "msg": "未曾創立過收集聊天訊息的子程序，請先建立"});
    }
    else {
        child.kill();
        res.json({"code": 0, "msg": "程序已終止，停止收集聊天訊息"});
    }
});

router.get('/liveChat/db', function(req, res, next) {
    if(req.query.start == undefined && req.query.end == undefined && req.query.keyword == undefined) { // 都沒有條件
        let container = [];
        db.all("SELECT * FROM messages", 
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start == undefined && req.query.end == undefined && req.query.keyword != undefined) { // 只有關鍵字
        let keyword_list = req.query.keyword.split("|");
        let sql_command = `SELECT * FROM messages WHERE (content LIKE '%${keyword_list[0]}%'`;
        for(let i = 1; i < keyword_list.length; ++i) {
            sql_command += ` OR content LIKE '%${keyword_list[i]}%'`;
        }
        sql_command += " ESCAPE '\\')";
        let container = [];
        db.all(sql_command,
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start != undefined && req.query.end != undefined && req.query.keyword == undefined) { // 只有開始結束時間
        let container = [];
        db.all("SELECT * FROM messages WHERE published_at BETWEEN ? AND ?", [req.query.start, req.query.end],
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start != undefined && req.query.end != undefined && req.query.keyword != undefined) { // 都有條件
        let keyword_list = req.query.keyword.split("|");
        let sql_command = `SELECT * FROM messages WHERE published_at BETWEEN '${req.query.start}' AND '${req.query.end}' AND (content LIKE '%${keyword_list[0]}%'`;
        for(let i = 1; i < keyword_list.length; ++i) {
            sql_command += ` OR content LIKE '%${keyword_list[i]}%'`;
        }
        sql_command += " ESCAPE '\\')";
        let container = [];
        db.all(sql_command,
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start == undefined && req.query.end != undefined && req.query.keyword != undefined) { // 有結束和關鍵字
        let keyword_list = req.query.keyword.split("|");
        let sql_command = `SELECT * FROM messages WHERE published_at <= '${req.query.end}' AND (content LIKE '%${keyword_list[0]}%'`;
        for(let i = 1; i < keyword_list.length; ++i) {
            sql_command += ` OR content LIKE '%${keyword_list[i]}%'`;
        }
        sql_command += " ESCAPE '\\')";
        let container = [];
        db.all(sql_command,
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start != undefined && req.query.end == undefined && req.query.keyword != undefined) { // 有開始和關鍵字
        let keyword_list = req.query.keyword.split("|");
        let sql_command = `SELECT * FROM messages WHERE published_at >= '${req.query.start}' AND (content LIKE '%${keyword_list[0]}%'`;
        for(let i = 1; i < keyword_list.length; ++i) {
            sql_command += ` OR content LIKE '%${keyword_list[i]}%'`;
        }
        sql_command += " ESCAPE '\\')";
        let container = [];
        db.all(sql_command,
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start == undefined && req.query.end != undefined && req.query.keyword == undefined) { // 只有結束
        let container = [];
        db.all("SELECT * FROM messages WHERE published_at <= ?", [req.query.end],
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start != undefined && req.query.end == undefined && req.query.keyword == undefined) { // 只有開始
        let container = [];
        db.all("SELECT * FROM messages WHERE published_at >= ?", [req.query.start],
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
});

router.get('/liveChat/db/no_dup_author', function(req, res, next) {
    if(req.query.start == undefined && req.query.end == undefined && req.query.keyword == undefined) { // 都沒有條件
        let container = [];
        db.all("SELECT * FROM messages GROUP BY author", 
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start == undefined && req.query.end == undefined && req.query.keyword != undefined) { // 只有關鍵字
        let keyword_list = req.query.keyword.split("|");
        let sql_command = `SELECT * FROM messages WHERE (content LIKE '%${keyword_list[0]}%'`;
        for(let i = 1; i < keyword_list.length; ++i) {
            sql_command += ` OR content LIKE '%${keyword_list[i]}%'`;
        }
        sql_command += " ESCAPE '\\') GROUP BY author";
        let container = [];
        db.all(sql_command,
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start != undefined && req.query.end != undefined && req.query.keyword == undefined) { // 只有開始結束時間
        let container = [];
        db.all("SELECT * FROM messages WHERE published_at BETWEEN ? AND ? GROUP BY author", [req.query.start, req.query.end],
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start != undefined && req.query.end != undefined && req.query.keyword != undefined) { // 都有條件
        let keyword_list = req.query.keyword.split("|");
        let sql_command = `SELECT * FROM messages WHERE published_at BETWEEN '${req.query.start}' AND '${req.query.end}' AND (content LIKE '%${keyword_list[0]}%'`;
        for(let i = 1; i < keyword_list.length; ++i) {
            sql_command += ` OR content LIKE '%${keyword_list[i]}%'`;
        }
        sql_command += " ESCAPE '\\') GROUP BY author";
        let container = [];
        db.all(sql_command,
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start == undefined && req.query.end != undefined && req.query.keyword != undefined) { // 有結束和關鍵字
        let keyword_list = req.query.keyword.split("|");
        let sql_command = `SELECT * FROM messages WHERE published_at <= '${req.query.end}' AND (content LIKE '%${keyword_list[0]}%'`;
        for(let i = 1; i < keyword_list.length; ++i) {
            sql_command += ` OR content LIKE '%${keyword_list[i]}%'`;
        }
        sql_command += " ESCAPE '\\') GROUP BY author";
        let container = [];
        db.all(sql_command,
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start != undefined && req.query.end == undefined && req.query.keyword != undefined) { // 有開始和關鍵字
        let keyword_list = req.query.keyword.split("|");
        let sql_command = `SELECT * FROM messages WHERE published_at >= '${req.query.start}' AND (content LIKE '%${keyword_list[0]}%'`;
        for(let i = 1; i < keyword_list.length; ++i) {
            sql_command += ` OR content LIKE '%${keyword_list[i]}%'`;
        }
        sql_command += " ESCAPE '\\') GROUP BY author";
        let container = [];
        db.all(sql_command,
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start == undefined && req.query.end != undefined && req.query.keyword == undefined) { // 只有結束
        let container = [];
        db.all("SELECT * FROM messages WHERE published_at <= ? GROUP BY author", [req.query.end],
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
    else if(req.query.start != undefined && req.query.end == undefined && req.query.keyword == undefined) { // 只有開始
        let container = [];
        db.all("SELECT * FROM messages WHERE published_at >= ? GROUP BY author", [req.query.start],
        (error, rows) => {
            if(rows != undefined)
                rows.forEach(row => {
                    container.push({
                        "published_at": row.published_at,
                        "avatar": row.avatar,
                        "author": row.author,
                        "content": row.content,
                    });
                });
            res.json({"code": 0, "items": container, "msg": "查詢完成"});
        });
    }
});

router.delete('/liveChat/db', function(req, res, next) {
    db.run("DELETE FROM messages");
    res.json({"code": 0, "msg": "已成功清空資料庫"});
});

router.get('/keyword', function(req, res, next) {
    let container = [];
    keyword_db.all("SELECT * FROM keywords", 
    (error, rows) => {
        if(rows != undefined)
            rows.forEach(row => {
                container.push({
                    "id": row.id,
                    "keyword": row.keyword,
                });
            });
        res.json({"code": 0, "items": container, "msg": "已成功查詢關鍵字"});
    });
});

router.post('/keyword', function(req, res, next) {
    if(!req.body.keyword) {
        res.json({"code": -1, "msg": "請輸入欲儲存的關鍵字"});
        return
    }
    keyword_db.run("INSERT INTO keywords(keyword) VALUES (?)", [req.body.keyword]);
    res.json({"code": 0, "msg": "已成功儲存關鍵字"});
});

router.delete('/keyword/db', function(req, res, next) {
    keyword_db.run("DELETE FROM keywords");
    keyword_db.run("UPDATE `sqlite_sequence` SET `seq` = 0 WHERE `name` = 'keywords'");
    res.json({"code": 0, "msg": "已成功清空資料庫"});
});

router.delete('/keyword/:id', function(req, res, next) {
    keyword_db.get("SELECT COUNT(*) FROM keywords WHERE id = ?", [req.params.id], (err, row) => {
        if(!row['COUNT(*)']) {
            res.json({"code": -1, "msg": "ID錯誤，關鍵字刪除失敗"});
            return
        }
        keyword_db.run("DELETE FROM keywords WHERE id = ?", [req.params.id], (result, err) => {
            if(err) {
                res.json({"code": -2, "msg": "SQLite錯誤，關鍵字刪除失敗"});
                return
            }
            res.json({"code": 0, "msg": "已成功刪除關鍵字"});
        });
    });
});

module.exports = router;
