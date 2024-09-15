const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const fs = require('fs');

let connectedUser = null; // Store the ID of the currently connected user

//find the path where this was located
const path = require('path');

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, '/public')));
app.use(express.static(path.join(__dirname, '/private')));

  
io.on('connection', (socket) => {
    const page = socket.handshake.query.page || 'unknown';

    logMessage(`${page} connected:`, socket.id);


    //Send Client WebRTC offer to Kiosk's Browser
    socket.on('offer', (offer) => {
        logMessage(`${page} offer from:`, socket.id)
        socket.broadcast.emit('offer', offer)
    });

    //Send Kiosk's answer back to client browser
    socket.on('answer',(answer) => {
        logMessage(`${page} answer from:`, socket.id)
        socket.broadcast.emit('answer', answer)
    });

    socket.on('disconnect', () => {
        logMessage(`${page} disconnected:`, socket.id);
    });

    socket.on('rosbridge status', (data) => {
        logMessage('Rosbridge Status', data)
    });
});


server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

// Function to log messages both to console and file
function logMessage(...args) {
    // Join all arguments into a single string with space between them
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');

    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}\n`;

    // Log to console
    console.log(...args);

    // Append log entry to file
    fs.appendFileSync('logfile.log', logEntry);
}