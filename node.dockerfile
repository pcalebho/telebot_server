# Start with the Node.js base image
FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json .
RUN npm install


# Expose necessary port for Node.js
EXPOSE 3000

#non-priveledged user
# RUN useradd -ms /bin/sh -u 1001 app
# USER app

# Start the Node.js server
CMD ["node", "backend/server.js"]
