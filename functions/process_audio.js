const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

exports.handler = async (event, context) => {
  try {
    // Create an instance of formidable.IncomingForm
    const form = new formidable.IncomingForm();

    // Parsing the multipart form data from the event body
    const { files } = await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ files });
      });
    });

    const audioFile = files.audio[0];
    
    if (!audioFile) {
      return {
        statusCode: 400,
        body: 'No audio file uploaded'
      };
    }

    // Save the file locally
    const tempPath = path.join('/tmp', audioFile.name);
    fs.writeFileSync(tempPath, audioFile.path);
    
    // Process the audio file (replace with your actual audio processing logic)
    await new Promise((resolve, reject) => {
      exec(`python3 process_audio.py ${tempPath}`, (error, stdout, stderr) => {
        if (error) {
          reject(`Audio processing error: ${stderr}`);
        } else {
          resolve(stdout);
        }
      });
    });

    // Return the processed file as a response
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
