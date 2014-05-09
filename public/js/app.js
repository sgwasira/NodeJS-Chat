$(document).foundation();

var users = [];
var socket = io.connect('http://' + ip);
var isActive = true;
var modalOpen = false;
var sounds = false;
var lastUser = '';
var lastUserMsgCount = 0;
var usersListOn = false;

$(document).ready(function () {
    updateContainer();
    $(window).resize(function() {
        updateContainer();
    });
});

function updateContainer() {
  var $containerHeight = $(window).height();
  $('.chatLog').animate({
    height: $(window).height() - 125
  }, 1000, function(){
    $('#chatLog').scrollTop($('#chatLog')[0].scrollHeight);
      setUsersList();
  });
}

function setUsersList(){
  if(!usersListOn){
    usersListOn = true;
    $('.main-section').append('<div class="usersListContainer show-for-large-up"><ul class="noList" id="inlineUsersList"><li><label>Online Users</label></li></ul></div>');
  }
  $('.usersListContainer').css({
    'left' :  $('#chatLog').position().left + $('#chatLog').width() - $('.usersListContainer').width() + 16,
    'top' : $('#chatLog').position().top + ($('#chatLog').outerHeight()-$('#chatLog').height())*2 + 8
  });
}

$('#chatLog').click(function(){
      $('#chatBox').focus();
    });

window.onfocus = function () {
  isActive = true;
  updateStatus();
  document.title = 'HardOrange Chat';
};

window.onblur = function () {
  isActive = false;
  updateStatus();
};

function checkInput(){
  var val = document.getElementById("chatBox").value;
  if(val.substr(0,5) == "/nick"){
    document.getElementById("chatBox").value = val.substr(0,25);
  }
}

$(document).on('opened', '[data-reveal]', function () {
  document.getElementById("newNick").focus();
  modalOpen = true;
});

$(document).on('closed', '[data-reveal]', function () {
  modalOpen = false;
});

function saveNick(){
  document.getElementById("chatBox").value = '/nick ' + document.getElementById("newNick").value;
  sendMessage();
  $('#changeNick').foundation('reveal', 'close');
}

function makeFancy(str){
  var tempStr = str;
    while(tempStr.indexOf("*") !== -1) {
        var firstPos = tempStr.indexOf("*");
        var nextPos = tempStr.indexOf("*",firstPos + 1);
        if(nextPos !== -1) {
            var innerTxt = tempStr.substring(firstPos + 1,nextPos);
            var strongified = '<strong>' + innerTxt + '</strong>';
            tempStr = tempStr.substring(0,firstPos) + strongified + tempStr.substring(nextPos + 1,tempStr.length);
        } else {
            tempStr = tempStr.replace('*','');
        }
    }
    return tempStr;
}

function chat(source, data) {
  var time = moment().format('HH:mm');
  var newSource;
  if(source == lastUser && lastUserMsgCount < 15){
    lastUserMsgCount++;
    newSource = '';
  } else {
    newSource = source;
    lastUserMsgCount=1;
  }
  if(newSource !== '' && newSource != 'SERVER' && newSource != $(nickname).html()){
    newSource = '<span class="chatUser">' + newSource + '</span>';
  }
  lastUser = source;
  if(newSource == 'SERVER'){
    newSource = '<span class="serverMessage">' + newSource + '</span>';
  }
  data = makeFancy(data);
  $('#chatLog').append(' \
    <div class="row"> \
      <div class="large-1 columns show-for-large-up right-seperator"> \
        <div class="chatTime full-height">' + '' + time + '' + '</div> \
      </div> \
      <div class="small-4 medium-2 large-2 columns right-seperator"> \
         <div class="chatName full-height">' + newSource + '</div> \
      </div> \
      <div class="small-8 medium-10 large-9 columns"> \
        <div class="chatMessage full-height">' + data + '</div> \
      </div> \
    </div> \
    ');
  linkUsers();
  if(source != 'SERVER'){
    notify(source + ': ' + data.replace(/(<([^>]+)>)/ig,""), false);
  }
  var height = $('.chatMessage').last().height();
  $('.chatName').last().css( {"height" : height});
  $('.chatTime').last().css( {"height" : height});
  $('#chatLog').scrollTop($('#chatLog')[0].scrollHeight);
  if(!isActive){
    var alert = new Audio('sounds/alert.mp3');
    playSound(alert);
    document.title = 'New Message!';
    if(data.toLowerCase().indexOf($(nickname).html().toLowerCase()) > -1){
      setTimeout(function(){playSound(alert);}, 6);
      document.title = 'You have been mentioned!';
      if(source != 'SERVER'){
        notify('You have been mentioned by ' + source + '!', false);
      }
    }
  }
}

function clearLog(){
  $('#chatLog').html('');
  lastUser = '';
  lastUserMsgCount = 0;
}

function updateUsers(data) {
  setUsersList();
  var list = "";
  list += '<li><label>Online Users</label></li>';
  for(var i in data) {
    list += '<li><a href="#" ';
    if(data[i][0] != $(nickname).html()){
      list += 'class="chatUser"';
    }
    list += '>' + data[i][0] + '</a><div class="dot"></div></li>';
  }
  document.getElementById("usersList").innerHTML = list;

  list = "";
  list += '<li><label>Online Users</label></li>';
  for(var j in data) {
    list += '<li><a href="#" ';
    if(data[j][0] != $(nickname).html()){
      list += 'class="chatUser"';
    }
    list += '>' + data[j][0] + '</a><div class="dot';
    if(data[j][2]){
      list += ' dot-active';
    } else {
      list += ' dot-away';
    }
    list += '"></div></li>';
  }

  document.getElementById("inlineUsersList").innerHTML = list;
  linkUsers();
}

function linkUsers(){
    $(".chatUser").click(function(){
      document.getElementById("chatBox").value = '/pm ' + $(this).html() + ' ';
      document.getElementById("chatBox").focus();
    });
}

function sendMessage(){
  if(!socket.socket.connected && document.getElementById("chatBox").value.trim() == "/connect"){
    socket.socket.connect();
  }

  if(document.getElementById("chatBox").value.trim() !== ""){
      $('#chatBox').removeClass("error");

    if(document.getElementById("chatBox").value.trim() == "/clear") {
      clearLog();
    } else {
      socket.emit('broadcast', {message: '' + document.getElementById("chatBox").value});
    }
    document.getElementById("chatBox").value = "";
  } else {
    if(!$('#chatBox').hasClass("error")){
      $('#chatBox').addClass("error");
    }
  }
}

function updateStatus(){
  socket.emit('status', {status: isActive});
}

function updateName(data){
  $(nickname).html(data.name);
  $('.tab-bar-section').children('.title').html('HardOrange Chat - ' + data.name);
}

$('#saveNick').click(function(){
  $.cookie('nick', $(nickname).html());
    notify('Nick saved!', true);
});

socket.on('connect', function(data){
  if($.cookie('nick') !== undefined){
    socket.emit('config', {name: $.cookie('nick')});
  } else {
    socket.emit('config', {name: ''}); //Request Guest Identifier
  }

  $(document).keydown(function(e) {
    if(e.which == 13) { //Enter Key
      if(modalOpen){
        saveNick();
      } else {
        sendMessage();
      }
    }
  });
  
});

socket.on('broadcast', function (data) {
  chat(data.client, data.message);
});

socket.on('annouce', function (data) {
  chat('SERVER', data.message);
});

socket.on('users', function (data) {
  updateUsers(data);
});

socket.on('name', function (data) {
  updateName(data);
});

socket.on('disconnect', function (data) {
  chat('SERVER', '<span class="serverMessage">You have disconnected. Type /connect to reconnect.</span>');
  updateUsers([]);
  //setTimeout(function(){location.reload();}, 1000); //LiveReload Substitute
});

var reverseEntityMap = {
  "&amp;" : "&",
  "&lt;" : "<",
  "&gt;" : ">",
  '&quot;' : '"',
  '&#39;' : "'",
  '&#x2F;' : "/"
};

function reverseEscapeHtml(string) {
  return String(string).replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;/g, function (s) {
    return reverseEntityMap[s];
  });
}

function notify(data, force){
  if((force || !isActive) && !Notify.needsPermission()){
    new Notify('HardOrange Chat', {
        body: reverseEscapeHtml(data),
        icon: 'images/hardorange_small.png',
        timeout: 10
    }).show();
  }
}

if(Notify.isSupported()){
  if(Notify.needsPermission()){
    needPermission();
  } else {
    noNeedPermission();
  }
} else {
  $('#enableNotifications').html('No Browser Notification Support');
}

function needPermission(){
  $('#enableNotifications').html('Enable Desktop Notifications');
  $('#enableNotifications').click(function(){
    Notify.requestPermission();
    noNeedPermission();
  });
}

function noNeedPermission(){
    $('#enableNotifications').html('Desktop Notifications Enabled');
    $('#enableNotifications').click(function(){
      notify('Notifications can be disabled in your browser\'s settings.',true);
    });
}

function playSound(sound){
  if(sounds){
    sound.play();
  }
}

$('#toggleSounds').click(function(){
  if(sounds){
    sounds = false;
    $('#toggleSounds').html('Enable Message Sounds');
  } else {
    sounds = true;
    $('#toggleSounds').html('Disable Message Sounds');
    var alert = new Audio('sounds/alert.mp3');
    playSound(alert);
  }
});

var swipeleft = Hammer(document.body).on("swiperight", function(ev) {
  $(".off-canvas-wrap").addClass("move-right");
});

var swiperight = Hammer(document.body).on("swipeleft", function(ev) {
  $(".off-canvas-wrap").addClass("move-left");
});
