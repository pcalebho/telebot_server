#!/bin/bash

# Find the PID of the process using port 3000
pid=$(lsof -t -i:3000)

rm server.pid

# Check if any process was found
if [ -z "$pid" ]; then
  echo "No Node.js process found on port 3000."
else
  # Kill the process
  echo "Killing process on port 3000 with PID: $pid"
  kill -9 $pid
  echo "Process $pid killed."
fi