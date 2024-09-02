const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

exports.handler = async (event, context) => {
  try {
    // Ensure form parsing
    const form = new formidable.IncomingForm();
    form.uploadDir = '/tmp'; // Directory for file uploads
    form.keepExtensions = true; // Keep file extensions

    // Handle the form data
    const { files } = await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) {
          reject(err);
        } else {
          resolve({ files });
        }
      });
    });

    const audioFile = files.audio;
    
    if (!audioFile) {
      return {
        statusCode: 400,
        body: 'No audio file uploaded'
      };
    }

    // Process the audio file
    const tempPath = path.join('/tmp', path.basename(audioFile.filepath)); // Updated property name
    fs.renameSync(audioFile.filepath, tempPath); // Move file to /tmp directory

    await new Promise((resolve, reject) => {
      exec(`python3 process_audio.py ${tempPath}`, (error, stdout, stderr) => {
        if (error) {
          reject(`Audio processing error: ${stderr}`);
        } else {
          resolve(stdout);
        }
      });
    });

    // Return the processed file
    const processedFilePath = tempPath.replace('.mp3', '_processed.mp3');
    if (fs.existsSync(processedFilePath)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
        body: fs.readFileSync(processedFilePath).toString('base64'),
        isBase64Encoded: true
      };
    } else {
      return {
        statusCode: 500,
        body: 'Processed file not found'
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: `Unexpected error: ${error.message}`
    };
  }
};
