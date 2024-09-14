import { speedBindings, gimbalBindings, moveBindings } from './bindings.js';

const socket = io();
const speed_limit = 1000.0;
const turn_limit = 50.0;

let kioskPeer, kioskStream, kioskVideo;
let speed = 1.0;
let turn = 1.0;

kioskVideo = document.getElementById('remoteVideo');

//using a dynamic dns makes it easier to transport between places, as I don't have to reupdate the server code
const ros = new ROSLIB.Ros({ url : 'ws://telepresencerobot.duckdns.org:8080' });
    ros.on('connection', () => {
    socket.emit('rosbridge status', 'successful')
    console.log("Successful RosBridge Websocket Connection");
});

ros.on('error', (error) => {
    console.log("Error RosBridge Websocket Connection");
    socket.emit('rosbridge status', 'error')
});

ros.on('close', () => {
    console.log("Closed RosBridge Websocket Connection");
    socket.emit('rosbridge status', 'closed')
});

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
        console.log('Peer connection closed');
        InitKiosk();
    });

    kioskPeer.on('data', data => {
        const decoder = new TextDecoder('utf-8');
        const sentKey = decoder.decode(data);
        console.log('Sent Key', sentKey);

        readKey(sentKey)
    });
}


function readKey(key){
    /*
    Takes keystroke and publishes velocity command to the /cmd_vel topic
     */
    let xlin = 0.0, ylin = 0.0, zlin = 0.0, th = 0.0;
    let speed_multiplier = 1.0, turn_multiplier = 1.0;
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
        const teleop_input = new ROSLIB.Message(twist_msg);

        cmd_vel_publisher.publish(teleop_input);
    }
    else if (key in speedBindings){
        [speed_multiplier, turn_multiplier] = speedBindings[key];

        speed = Math.min(speed_multiplier*speed, speed_limit);
        turn = Math.min(turn_multiplier*speed, turn_limit);
    }        
    else if (key in gimbalBindings){
        console.log(gimbalBindings[key])
        const gimbal_input = new ROSLIB.Message({data: gimbalBindings[key]});
        gimbal_cmd_publisher.publish(gimbal_input)
    }
}     