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
  socket.join(room);
  io.sockets.in(room).emit('join', { socketId: socket.id });

  let clientProperties = {};
  clientsConnected[socket.id] = clientProperties;

  socket.on('toServer', (message) => {
    if (message.startsWith('/')) {
      console.log(`Command send : ${message.split(' ')[0]}`);
    } else {
      console.log(`Client ${socket.id} send : ${message} from ${room}`);
      io.sockets.in(room).emit('fromServer', { sender: socket.id, message: message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} disconnected`);
    delete clientsConnected[socket.id];
  });

  function executeCommand(cmd, params) {
    switch (cmd) {
      case '/room':
        // TODO Room changement
        if (params.length >= 1 && params[0].length >= 3) {
          socket.leave(room);
          room = params[0];
          socket.join(room);
        } else {
          socket.emit('warning', 'Use /room <room_name>')
        }

        break;
      // Add other case Name changement ...
      default:
        break;
    }
  }
});