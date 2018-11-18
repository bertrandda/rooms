let express = require('express');
let app = express();

app.set('port', 3000);

app.use(express.static(__dirname + '/public'));

app.get('/', (request, response) => {
  response.sendFile(__dirname + '/public/html/client.html');
});

let server = app.listen(app.get('port'), () => {
  console.log('Rooms is running on port', app.get('port'));
});

var clientsConnected = {}

let io = require('socket.io')(server);
io.on('connection', (socket) => {
  let room = filterText(socket.handshake.query.room);
  let user = filterText(socket.handshake.query.user);
  if (room.length < 3 || user.length < 3) {
    socket.disconnect(true);
    return;
  }

  socket.emit('init', {});
  joinRoom(room);

  let i = 1;
  while (true) {
    if (!Object.values(clientsConnected).includes(`${user}${i}`)) {
      clientsConnected[socket.id] = `${user}${i}`;
      break;
    }
    i++;
  }

  socket.on('toServer', (message) => {
    message = filterText(message);
    if (message.length == 0) {
      return;
    } else if (message.startsWith('/')) {
      executeCommand(message.split(' '))
    } else {
      socket.broadcast.to(room).emit('fromServer', { sender: clientsConnected[socket.id], message: message });
    }
  });

  socket.on('disconnect', () => {
    delete clientsConnected[socket.id];
  });

  function joinRoom(room) {
    socket.join(room);
    socket.emit('join', { room: room });
  }

  function executeCommand(params) {
    switch (params[0]) {
      case '/help':
        socket.emit('warning', { message: filterText('Change the room : /room <room_name>') });
        socket.emit('warning', { message: filterText('Disconnection : /disconnect') });
        break;
      case '/room':
        if (params.length >= 2 && room != params[1] && params[1].length > 2) {
          socket.leave(room);
          room = params[1];
          joinRoom(room);
        } else {
          socket.emit('warning', { message: filterText('Use /room <room_name>') })
        }
        break;
      case '/disconnect':
        socket.disconnect();
        break;
      default:
        socket.emit('warning', { message: 'Use /help to know how commands work' })
        break;
    }
  }

  function filterText(input) {
    return input.trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
});