const jwt = require('jsonwebtoken');
const fs = require('fs');

// Your Apple Developer credentials
const TEAM_ID = 'UJ2X7H6A7E'; // 10-character Team ID
const CLIENT_ID = 'com.smartbot.superchat1'; // Your Services ID (e.g., com.yourapp.service)
const KEY_ID = 'LU7X8GK282'; // 10-character Key ID from the .p8 file
const P8_FILE_PATH = './AuthKey_LU7X8GK282.p8'; // Path to your .p8 file

// Read the private key
const privateKey = fs.readFileSync(P8_FILE_PATH, 'utf8');

// Generate the JWT
const token = jwt.sign(
  {
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (6 * 30 * 24 * 60 * 60), // 6 months
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  },
  privateKey,
  {
    algorithm: 'ES256',
    keyid: KEY_ID,
  }
);

console.log('Client Secret (JWT):', token);