const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

exports.handler = async (event) => {
  try {
    // Decode the base64-encoded body
    const bodyBuffer = Buffer.from(event.body, 'base64');
    
    // Assume the file is uploaded as a single part, so we extract it directly
    const boundary = event.headers['content-type'].split('boundary=')[1];
    const body = bodyBuffer.toString('binary');
    const parts = body.split(`--${boundary}`);
    
    // Extract the file content and its metadata
    const filePart = parts.find(part => part.includes('filename='));
    const [fileMetadata, fileContent] = filePart.split('\r\n\r\n');
    const contentDisposition = fileMetadata.split('; ').find(param => param.startsWith('filename='));
    const filename = contentDisposition.split('=')[1].replace(/"/g, '');
    
    // Save the file locally
    const tempPath = path.join('/tmp', filename);
    fs.writeFileSync(tempPath, fileContent, 'binary');
    
    // Process the audio file using the Python script
    await new Promise((resolve, reject) => {
      exec(`python3 process_audio.py ${tempPath}`, (error, stdout, stderr) => {
        if (error) {
          reject(`Error: ${stderr}`);
        } else {
          resolve(stdout);
        }
      });
    });

    // Return the processed file as a response
    const processedFilePath = tempPath.replace('.mp3', '_processed.mp3');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
      body: fs.readFileSync(processedFilePath).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Error: ${error.message}`
    };
  }
};
