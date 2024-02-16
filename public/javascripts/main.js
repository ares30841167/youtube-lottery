const socket = io("ws://127.0.0.1:9000/", {
    path: "/socket.io/"
  });

socket.on("child_stdout", (msg) => {
    $("#proc_log").append(msg);
    var log_console = $('#proc_log');
    if(log_console.length)
        log_console.scrollTop(log_console[0].scrollHeight - log_console.height());
});

socket.on("child_stderr", (msg) => {
    $("#proc_log").append(msg);
    var log_console = $('#proc_log');
    if(log_console.length)
        log_console.scrollTop(log_console[0].scrollHeight - log_console.height());
});

socket.on("child_close", (msg) => {
    $("#proc_log").append(msg);
    var log_console = $('#proc_log');
    if(log_console.length)
        log_console.scrollTop(log_console[0].scrollHeight - log_console.height());
    $("#liveChat_start").prop('disabled', false);
    $("#vid").prop('readonly', false);
});

function load_keyword(keyword) {
    $("#close_keyword_list_btn").click();
    $("#keyword").val(keyword);
}

function delete_keyword(id) {
    var yes = confirm('你確定要刪除此筆關鍵字紀錄嗎? (一經刪除無法復原喔)');
    if(yes) {
        $.ajax({
            url: "api/v1/keyword/" + id,
            method: "DELETE",
            dataType: "json",
            success:function(res){
                alert("刪除成功");
                let keyword_list_body = $("#keyword_list > tbody");
                $.ajax({
                    url: "api/v1/keyword/",
                    method: "GET",
                    dataType: "json",
                    success:function(res){
                        keyword_list_body.empty();
                        let i = 1;
                        res["items"].forEach(element => {
                            keyword_list_body.append('<tr><td>'+i+'</td><td>'+element["keyword"]+'</td><td><div class="row row-cols-auto g-2"><div class="col"><button class="btn btn-primary" type="button" onclick="load_keyword(\''+element["keyword"]+'\');">讀取</button></div><div class="col"><button class="btn btn-danger" type="button" onclick="delete_keyword('+element["id"]+');">刪除</button></div></div></td></tr>');
                            i++;
                        });
                    }
                });
            }
        });
    }
}

$(document).ready(() => {

    $('form input').keydown((event) => {
        if(event.keyCode == 13) {
            event.preventDefault();
            return false;
        }
    });

    let no_dup_author_result = [];

    let timestamp = Date.now();
    let datetimeObj = new Date(timestamp);
    let date = ("0" + datetimeObj.getDate()).slice(-2);
    let month = ("0" + (datetimeObj.getMonth() + 1)).slice(-2);
    let year = datetimeObj.getFullYear();
    let hours = ("0" + datetimeObj.getHours()).slice(-2);
    let minutes = ("0" + datetimeObj.getMinutes()).slice(-2);

    $("#range_date_start").val(`${year}-${month}-${date}`);
    $("#range_time_start").val(`${hours}:${minutes}`);
    $("#range_date_end").val(`${year}-${month}-${date}`);
    $("#range_time_end").val(`${hours}:${minutes}`);

    $.ajax({
        url: "api/v1/liveChat",
        method: "GET",
        dataType: "json",
        success:function(res){
            if(res["running_stats"] == true) {
                $("#liveChat_start").prop('disabled', true);
                $("#vid").prop('readonly', true);
                $("#vid").val(res["vid"]);
            }
        }
    });

    $("#liveChat_start").click(() => {
        let vid = $("#vid").val();
        if(vid == "") {
            alert('請輸入影片ID');
            return;
        }
        $.ajax({
            url: "api/v1/liveChat/" + vid,
            method: "POST",
            dataType: "json",
            success:function(res){
                $("#liveChat_start").prop('disabled', true);
                $("#vid").prop('readonly', true);
            }
        });
    });

    $("#liveChat_stop").click(() => {
        $.ajax({
            url: "api/v1/liveChat",
            method: "DELETE",
            dataType: "json",
            success:function(res){
                $("#liveChat_start").prop('disabled', false);
                $("#vid").prop('readonly', false);
            }
        });
    });

    $("#liveChat_clear").click(() => {
        var yes = confirm('你確定要清空抓取到的聊天訊息嗎? (一經刪除無法復原喔)');
        if (yes) {
            $.ajax({
                url: "api/v1/liveChat/db/",
                method: "DELETE",
                dataType: "json",
                success:function(res){
                    alert('已成功刪除所有聊天訊息');
                }
            });
        }
    });

    $("#keyword_show_list").click(() => {
        let keyword_list_body = $("#keyword_list > tbody");
        $.ajax({
            url: "api/v1/keyword/",
            method: "GET",
            dataType: "json",
            success:function(res){
                keyword_list_body.empty();
                let i = 1;
                res["items"].forEach(element => {
                    keyword_list_body.append('<tr><td>'+i+'</td><td>'+element["keyword"]+'</td><td><div class="row row-cols-auto g-2"><div class="col"><button class="btn btn-primary" type="button" onclick="load_keyword(\''+element["keyword"]+'\');">讀取</button></div><div class="col"><button class="btn btn-danger" type="button" onclick="delete_keyword('+element["id"]+');">刪除</button></div></div></td></tr>');
                    i++;
                });
            }
        });
    });

    $("#keyword_save").click(() => {
        let keyword = $("#keyword").val();
        if(keyword == "") {
            alert("請輸入關鍵字再按儲存");
            return;
        }
        let json_obj = {};
        json_obj["keyword"] = keyword;
        $.ajax({
            url: "api/v1/keyword/",
            method: "POST",
            dataType: "json",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(json_obj),
            success:function(res){
                alert('已成功儲存關鍵字');
            }
        });
    });

    $("#keyword_clear").click(() => {
        var yes = confirm('你確定要清空所有儲存的關鍵字嗎? (一經刪除無法復原喔)');
        if (yes) {
            $.ajax({
                url: "api/v1/keyword/db/",
                method: "DELETE",
                dataType: "json",
                success:function(res){
                    alert('已成功刪除所有關鍵字紀錄');
                }
            });
        }
    });

    $("#liveChat_search").click(() => {
        $("#search_count").text("符合條件的總共0筆");
        let start = $("#range_date_start").val().replaceAll('-', '/') + " " + $("#range_time_start").val() + ":00";
        let end = $("#range_date_end").val().replaceAll('-', '/') + " " + $("#range_time_end").val() + ":00";
        if(start === " :00")
            start = undefined;
        if(end === " :00")
            end = undefined;
        let keyword = $("#keyword").val();
        keyword = keyword.replaceAll('+', '%2b');
        keyword = keyword.replaceAll('%', '%25');
        if(start !== undefined && end !== undefined) {
            $.ajax({
                url: `api/v1/liveChat/db?start=${start}&end=${end}&keyword=${keyword}`,
                method: "GET",
                dataType: "json",
                success:function(res){
                    $("#search_count").text(`符合條件的總共${res["items"].length}筆`);
                    $.ajax({
                        url: `api/v1/liveChat/db/no_dup_author?start=${start}&end=${end}&keyword=${keyword}`,
                        method: "GET",
                        dataType: "json",
                        success:function(res){
                            $("#search_count").append(`/去掉姓名重複剩${res["items"].length}筆`);
                            no_dup_author_result = res["items"];
                        }
                    });
                    $("#search_table").html("<thead><tr><th>發言時間</th><th>頭像</th><th>作者</th><th>內容</th></tr></thead>");
                    $("#search_table").append("<tbody>");
                    for (i in res["items"]) {
                        $("#search_table").append(`<tr><td>${res["items"][i]["published_at"]}</td><td><img src=${res["items"][i]["avatar"]} /></td><td>${res["items"][i]["author"]}</td><td>${res["items"][i]["content"]}</td></tr>`);
                    }
                    $("#search_table").append("</tbody>");
                }
            });
        }
        if(start === undefined && end !== undefined) {
            $.ajax({
                url: `api/v1/liveChat/db?end=${end}&keyword=${keyword}`,
                method: "GET",
                dataType: "json",
                success:function(res){
                    $("#search_count").text(`符合條件的總共${res["items"].length}筆`);
                    $.ajax({
                        url: `api/v1/liveChat/db/no_dup_author?end=${end}&keyword=${keyword}`,
                        method: "GET",
                        dataType: "json",
                        success:function(res){
                            $("#search_count").append(`/去掉姓名重複剩${res["items"].length}筆`);
                            no_dup_author_result = res["items"];
                        }
                    });
                    $("#search_table").html("<thead><tr><th>發言時間</th><th>頭像</th><th>作者</th><th>內容</th></tr></thead>");
                    $("#search_table").append("<tbody>");
                    for (i in res["items"]) {
                        $("#search_table").append(`<tr><td>${res["items"][i]["published_at"]}</td><td><img src=${res["items"][i]["avatar"]} /></td><td>${res["items"][i]["author"]}</td><td>${res["items"][i]["content"]}</td></tr>`);
                    }
                    $("#search_table").append("</tbody>");
                }
            });
        }
        if(start !== undefined && end === undefined) {
            $.ajax({
                url: `api/v1/liveChat/db?start=${start}&keyword=${keyword}`,
                method: "GET",
                dataType: "json",
                success:function(res){
                    $("#search_count").text(`符合條件的總共${res["items"].length}筆`);
                    $.ajax({
                        url: `api/v1/liveChat/db/no_dup_author?start=${start}&keyword=${keyword}`,
                        method: "GET",
                        dataType: "json",
                        success:function(res){
                            $("#search_count").append(`/去掉姓名重複剩${res["items"].length}筆`);
                            no_dup_author_result = res["items"];
                        }
                    });
                    $("#search_table").html("<thead><tr><th>發言時間</th><th>頭像</th><th>作者</th><th>內容</th></tr></thead>");
                    $("#search_table").append("<tbody>");
                    for (i in res["items"]) {
                        $("#search_table").append(`<tr><td>${res["items"][i]["published_at"]}</td><td><img src=${res["items"][i]["avatar"]} /></td><td>${res["items"][i]["author"]}</td><td>${res["items"][i]["content"]}</td></tr>`);
                    }
                    $("#search_table").append("</tbody>");
                }
            });
        }
        if(start === undefined && end === undefined) {
            $.ajax({
                url: `api/v1/liveChat/db?keyword=${keyword}`,
                method: "GET",
                dataType: "json",
                success:function(res){
                    $("#search_count").text(`符合條件的總共${res["items"].length}筆`);
                    $.ajax({
                        url: `api/v1/liveChat/db/no_dup_author?keyword=${keyword}`,
                        method: "GET",
                        dataType: "json",
                        success:function(res){
                            $("#search_count").append(`/去掉姓名重複剩${res["items"].length}筆`);
                            no_dup_author_result = res["items"];
                        }
                    });
                    $("#search_table").html("<thead><tr><th>發言時間</th><th>頭像</th><th>作者</th><th>內容</th></tr></thead>");
                    $("#search_table").append("<tbody>");
                    for (i in res["items"]) {
                        $("#search_table").append(`<tr><td>${res["items"][i]["published_at"]}</td><td><img src=${res["items"][i]["avatar"]} /></td><td>${res["items"][i]["author"]}</td><td>${res["items"][i]["content"]}</td></tr>`);
                    }
                    $("#search_table").append("</tbody>");
                }
            });
        }
    });

    $("#liveChat_search_without_datetime").click(() => {
        $("#search_count").text("符合條件的總共0筆");
        let keyword = $("#keyword").val();
        keyword = keyword.replaceAll('+', '%2b');
        keyword = keyword.replaceAll('%', '%25');
        $.ajax({
            url: `api/v1/liveChat/db?keyword=${keyword}`,
            method: "GET",
            dataType: "json",
            success:function(res){
                $("#search_count").text(`符合條件的總共${res["items"].length}筆`);
                $.ajax({
                    url: `api/v1/liveChat/db/no_dup_author?keyword=${keyword}`,
                    method: "GET",
                    dataType: "json",
                    success:function(res){
                        $("#search_count").append(`/去掉姓名重複剩${res["items"].length}筆`);
                        no_dup_author_result = res["items"];
                    }
                });
                $("#search_table").html("<thead><tr><th>發言時間</th><th>頭像</th><th>作者</th><th>內容</th></tr></thead>");
                $("#search_table").append("<tbody>");
                for (i in res["items"]) {
                    $("#search_table").append(`<tr><td>${res["items"][i]["published_at"]}</td><td><img src=${res["items"][i]["avatar"]} /></td><td>${res["items"][i]["author"]}</td><td>${res["items"][i]["content"]}</td></tr>`);
                }
                $("#search_table").append("</tbody>");

            }
        });
    });

    $("#liveChat_search_clear").click(() => {
        $("#search_count").text("符合條件的總共0筆");
        no_dup_author_result = [];
        $("#search_table").html("<thead><tr><th>發言時間</th><th>頭像</th><th>作者</th><th>內容</th></tr></thead>");
    });

    $("#liveChat_search_reset_datetime").click(() => {
        let timestamp = Date.now();
        let datetimeObj = new Date(timestamp);
        let date = ("0" + datetimeObj.getDate()).slice(-2);
        let month = ("0" + (datetimeObj.getMonth() + 1)).slice(-2);
        let year = datetimeObj.getFullYear();
        let hours = ("0" + datetimeObj.getHours()).slice(-2);
        let minutes = ("0" + datetimeObj.getMinutes()).slice(-2);
    
        $("#range_date_start").val(`${year}-${month}-${date}`);
        $("#range_time_start").val(`${hours}:${minutes}`);
        $("#range_date_end").val(`${year}-${month}-${date}`);
        $("#range_time_end").val(`${hours}:${minutes}`);
    });

    $("#pick").click(() => {
        $("#pick_count").text(`總共抽出0筆`);
        $("#pick_table").html("<thead><tr><th>發言時間</th><th>頭像</th><th>作者</th><th>內容</th></tr></thead>");

        if($("#pick_amount").val() === "") {
            alert("請輸入抽選人數");
            return;
        }

        let pick_amount = parseInt($("#pick_amount").val());

        if(pick_amount <= 0) {
            alert("無法抽選小於等於0人");
            return;
        }

        if(no_dup_author_result.length === 0) {
            alert("搜尋結果無人可供抽選，或所有搜尋結果已經全數抽完一輪(請重新執行第三步一次)");
            return;
        }

        if(pick_amount >= no_dup_author_result.length) {
            $("#pick_count").text(`總共抽出${no_dup_author_result.length}筆`);
            $("#pick_table").append("<tbody>");
            for(let i = 0; i < no_dup_author_result.length; ++i) {
                $("#pick_table").append(`<tr><td>${no_dup_author_result[i]["published_at"]}</td><td><img src=${no_dup_author_result[i]["avatar"]} /></td><td>${no_dup_author_result[i]["author"]}</td><td>${no_dup_author_result[i]["content"]}</td></tr>`);
            }
            $("#pick_table").append("</tbody>");
            no_dup_author_result = [];
            return;
        }

        $("#pick_count").text(`總共抽出${pick_amount}筆`);
        $("#pick_table").append("<tbody>");
        while(pick_amount > 0) {
            let picked_number = Math.floor(Math.random() * no_dup_author_result.length);
            $("#pick_table").append(`<tr><td>${no_dup_author_result[picked_number]["published_at"]}</td><td><img src=${no_dup_author_result[picked_number]["avatar"]} /></td><td>${no_dup_author_result[picked_number]["author"]}</td><td>${no_dup_author_result[picked_number]["content"]}</td></tr>`);
            no_dup_author_result.splice(picked_number, 1);
            pick_amount--;
        }
        $("#pick_table").append("</tbody>");
    });

    $("#pick_clear").click(() => {
        $("#pick_count").text("總共抽出0筆");
        $("#pick_table").html("<thead><tr><th>發言時間</th><th>頭像</th><th>作者</th><th>內容</th></tr></thead>");
    });

});