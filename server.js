// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let connectedUser = null; // Store the ID of the currently connected user

//find the path where this was located
const path = require('path');

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, '/public')));
app.use(express.static(path.join(__dirname, '/private')));

  
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);


    //Send Client WebRTC offer to Kiosk's Browser
    socket.on('offer', (offer) => {
        console.log('Offer from:', socket.id)
        socket.broadcast.emit('offer', offer)
    });

    //Send Kiosk's answer back to client browser
    socket.on('answer',(answer) => {
        console.log('Answer from:', socket.id)
        socket.broadcast.emit('answer', answer)
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    socket.on('rosbridge status', (data) => {
        console.log('Rosbridge Status', data)
    });
});


server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
