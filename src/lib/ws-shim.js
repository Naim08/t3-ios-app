// Custom WebSocket shim for React Native
// Only exports client WebSocket functionality, excludes server components

'use strict';

// Use the native WebSocket in React Native environment
const WebSocket = global.WebSocket;

// Only export the client WebSocket, no server functionality
module.exports = WebSocket;
module.exports.default = WebSocket;
module.exports.WebSocket = WebSocket;
