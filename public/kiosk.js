import { speedBindings, gimbalBindings, moveBindings } from './bindings.js';

const socket = io({
    query: { page: 'kiosk' }
});

const speed_limit = 0.8;
const turn_limit = 0.8;
const min_speed_limit = 0.1;
const min_turn_limit = 0.1;

let speed = 0.5;
let turn = 0.5;

const maxReconnectAttempts = 5;
let reconnectAttempts = 0;

let kioskPeer, kioskStream, kioskVideo;


kioskVideo = document.getElementById('remoteVideo');

const websocketURL =  'wss://telepresencerobot.duckdns.org'


//using a dynamic dns makes it easier to transport between places, as I don't have to reupdate the server code
const ros = new ROSLIB.Ros({ url : websocketURL});

ros.on('connection', () => {
    socket.emit('rosbridge status', 'successful')
    console.log("Successful RosBridge Websocket Connection");
});

ros.on('error', (error) => {
    console.log("Error RosBridge Websocket Connection");
    socket.emit('rosbridge status', 'error');
    if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(() => {
            ros.connect(websocketURL);
        }, 1000); // Retry in 5 seconds
    } else {
        console.log("Max reconnect attempts reached. Reloading...");
        window.location.reload(); // Reload as a last resort
    }
});

ros.on('close', () => {
    console.log("Closed RosBridge Websocket Connection");
    socket.emit('rosbridge status', 'closed');
    if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(() => {
            ros.connect(websocketURL);
        }, 1000); // Retry in 1 seconds
    } else {
        console.log("Max reconnect attempts reached. Reloading...");
        window.location.reload(); // Reload as a last resort
    }
});

setInterval(function() {
    if (ros.isConnected) {
        socket.emit('rosbridge status', 'connected')
    } else {
        socket.emit('rosbridge status', 'disconnected')
    }
}, 5000); // Send status every 5 seconds

const cmd_vel_publisher = new ROSLIB.Topic({
    ros,
    name: "/cmd_vel",
    messageType: "geometry_msgs/Twist"
});

const gimbal_cmd_publisher = new ROSLIB.Topic({
    ros,
    name: "/gimbal_command",
    messageType: "std_msgs/Bool"
})


// Request user media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        kioskStream = stream;
        
        InitKiosk();

        // Signal when receiving a signal
        socket.on('offer', (data) => {
            kioskPeer.signal(data);
        });              
    })
    .catch((err) => {
        console.error('Error accessing media devices.', err);
    });


function InitKiosk() {
    /*Initializes the Peer connection with the client browser */
    if (kioskPeer){
        kioskPeer.destroy();
    }

    // Create a new peer connection
    kioskPeer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream: kioskStream
    });

    // Send signals to the other peer
    kioskPeer.on('signal', (data) => {
        socket.emit('answer', data);
    });

    // Add the remote stream
    kioskPeer.on('stream', (stream) => {
        kioskVideo.srcObject = stream;
    });

    kioskPeer.on('close', () => {
        kioskVideo.style.visibility = "hidden";
        console.log('Peer connection closed');
        requestAnimationFrame(() => {
            InitKiosk();
        });
    });

    kioskPeer.on('data', data => {
        const decoder = new TextDecoder('utf-8');
        const sentKey = decoder.decode(data);
        console.log('Sent Key', sentKey);

        readKey(sentKey)
    });

    kioskPeer.on('error', () => {
        console.log('Peer Connection Error');
        kioskVideo.style.visibility = "hidden";
        window.location.reload();
    })

    kioskPeer.on('connect', () => {
        kioskVideo.style.visibility = "visible";
        socket.emit('speed', speed)
    })
}


function readKey(key){
    /*
    Takes keystroke and publishes velocity command to the /cmd_vel topic
     */
    let xlin = 0.0, ylin = 0.0, zlin = 0.0, th = 0.0;
    let speed_modifier = 0, turn_modifier = 0;
    if (key in moveBindings){
        [xlin, ylin, zlin, th] = moveBindings[key];


        let twist_msg = {
            linear: {
                x: xlin*speed,
                y: ylin*speed,
                z: zlin*speed
            },
            angular: {
                x: 0,
                y: 0,
                z: th*turn
            }
        };

        //force backing up to be much slower
        if (twist_msg.linear.x < 0){
            twist_msg.linear.x = -0.1;
        }

        const teleop_input = new ROSLIB.Message(twist_msg);

        cmd_vel_publisher.publish(teleop_input);
    }
    else if (key in speedBindings){
        [speed_modifier, turn_modifier] = speedBindings[key];

        speed = Math.min(speed_modifier+speed, speed_limit);
        speed = Math.max(speed, min_speed_limit)
        turn = Math.min(turn_modifier+turn, turn_limit);
        turn = Math.max(turn, min_turn_limit);
        socket.emit('speed', speed)
    }        
    else if (key in gimbalBindings){
        console.log(gimbalBindings[key])
        const gimbal_input = new ROSLIB.Message({data: gimbalBindings[key]});
        gimbal_cmd_publisher.publish(gimbal_input)
    }
}     