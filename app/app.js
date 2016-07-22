window.$ = window.jQuery = require('./helpers/jquery-3.1.0');

var username, server, websocket, wview;

function remove(id) {
  return (remove.elem=document.getElementById(id)).parentNode.removeChild(remove.elem);
}

function header_log(text) {
  $('#terminal').append('<p></p>').text(text);
  $('#terminal').append('<br />')
}

function onMessage(e) {
  //header_log(e.data);
  var data = $.parseJSON(e.data);
  if (data.event === "ChatMessage") {
    var msg = data.data.message.message[0].text.split(" ");
    if (msg[0] === "!eval") {
      msg.shift();
      msg = msg.join(" ");
      wview.executeJavaScript(msg);
    } else if (msg[0] === "!reset") {
      wview.reloadIgnoringCache();
    }
  }
}

function onOpen(e) {
  console.log("connected");
  websocket.send('{"type":"method","method":"auth","arguments":["' + username + '"],"id":1}');
}

function initialize () {
  remove('uname');
  function resize_callback () {
    $('.container').css({
      position: 'absolute',
      width: $(window).width(),
      height: $(window).height(),
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    });
  }
  $(window).resize(function() {
    resize_callback();
  });
  resize_callback();
  $.ajax({
      dataType: "json"
      , url: 'https://beam.pro/api/v1/channels/' + username
      , success: function (data) {
        username = data.id;
        if ("WebSocket" in window) {
          $.ajax({
            dataType: "json"
          , url: 'https://beam.pro/api/v1/chats/' + username
          , success: function (data) {
            var rand = Math.floor(Math.random() * (0 - 1 + 1) + 0);
            server = data.endpoints[rand];
            websocket = new WebSocket(server)
            websocket.onmessage = onMessage;
            websocket.onopen = onOpen;
          }
        });
      }
    }
  })
  wview.addEventListener('console-message', (e) => {
    var msg = e.message;
    header_log('Console: \t' + msg);
  });
}


document.addEventListener('DOMContentLoaded', function () {
  var uname_box = document.getElementById('uname');
  wview = document.getElementById('wview');
  uname_box.onkeypress = function(e) {
    if (!e) e = window.event;
    var keyCode = e.keyCode || e.which;
    if (keyCode == '13') {
      username = this.value;
      console.log(username);
      initialize();
      return false;
    }
  }
});
