let io;
module.exports = {
    init: function(server) {
        io = require('socket.io')(server, {
            cors: {
              origin: "*",
              methods: ["GET", "POST"],
              credentials: true
            }
          });
        return io;
    },
    getio: function() {
        if (!io) {
            throw new Error("must call .init(server) before you can call .getio()");
        }
        return io;
    }
}