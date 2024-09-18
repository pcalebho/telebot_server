import { speedBindings, gimbalBindings, moveBindings } from './bindings.js';

const socket = io({
    query: { page: 'client' }
});
let clientPeer, localStream, kioskVideo, clientVideo, rosbridgeStatus, infoSpeed;

kioskVideo = document.getElementById('remoteVideo');
clientVideo = document.getElementById('localVideo');
infoSpeed = document.getElementById('speed-info');
rosbridgeStatus = document.getElementById('ros-info');

const dockButton = document.getElementById('dock-button');
const undockButton = document.getElementById('undock-button');

/*
TODO
Make client ping kiosk browser for rosbridge status
*/

socket.on('speed', (speed) => {
    let displaySpeed = 0;
    displaySpeed = Math.round(speed*100);
    infoSpeed.innerHTML = `Speed: ${displaySpeed}`;
});

socket.on('rosbridge status', (status) => {
    rosbridgeStatus.innerHTML = `Rosbridge Status: ${status}`;
});

// Request user media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localStream = stream;
        clientVideo.srcObject = localStream;
        
        InitPeer();

        // Signal when receiving a signal
        socket.on('answer', (data) => {
            clientPeer.signal(data);
        });

    })
    .catch((err) => {
        console.error('Error accessing media devices.', err);
    });


function InitPeer() {
    if (clientPeer){
        clientPeer.destroy();
    }

    // Create a new peer connection
    clientPeer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: localStream
    });

    // Send signals to the other peer
    clientPeer.on('signal', (data) => {
        socket.emit('offer', data);
        console.log("Offer: ", data)
    });

    // Add the remote stream
    clientPeer.on('stream', (stream) => {
        kioskVideo.srcObject = stream;
    });

    clientPeer.on('close', () => {
        console.log('Peer connection closed');
        InitPeer();
    });

    clientPeer.on('connect', () => {
        window.addEventListener("keydown", sendKey);
        dockButton.addEventListener('click',  () => sendAction('dock'));
        undockButton.addEventListener('click', () => sendAction('undock'));
    });
}

function sendKey(e) {
    const key = e.key;
    if (key in moveBindings || key in gimbalBindings || key in speedBindings){
        console.log('Keystroke sent to robot: ', key)
        clientPeer.send(key);
    } else {
        console.log(key, 'is not a valid key stroke');
    }    
}

function sendAction(action) {
    clientPeer.send(action);
}

