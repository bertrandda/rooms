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
  let room = socket.handshake.query.room;
  if (room.length < 3) {
    socket.disconnect(true);
    return;
  }

  console.log(`Connection with ${socket.id} in ${room}`);
  socket.emit('init', { socketId: socket.id });
  joinRoom(room);

  let clientProperties = {};
  clientsConnected[socket.id] = clientProperties;

  socket.on('toServer', (message) => {
    if (message.startsWith('/')) {
      executeCommand(message.split(' '))
    } else {
      io.sockets.in(room).emit('fromServer', { sender: socket.id, message: message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} disconnected`);
    delete clientsConnected[socket.id];
  });

  function joinRoom(room) {
    socket.join(room);
    io.sockets.in(room).emit('join', { socketId: socket.id, room:room });
  }

  function executeCommand(params) {
    console.log(params);
    switch (params[0]) {
      case '/room':
        // TODO Room changement
        if (params.length >= 2) {
          socket.leave(room);
          room = params[1];
          joinRoom(room);
        } else {
          socket.emit('warning', { message: 'Use /room <room_name>' })
        }
        break;
      // Add other case Name changement ...
      default:
        socket.emit('warning', { message: 'Use /help to know how commands work' })
        break;
    }
  }
});