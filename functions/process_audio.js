const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

exports.handler = async (event) => {
  return new Promise((resolve, reject) => {
    // Create an instance of the formidable form parser
    const form = new formidable.IncomingForm();
    form.uploadDir = '/tmp'; // Temporary directory to save files
    form.keepExtensions = true; // Keep file extensions

    form.parse(event, (err, fields, files) => {
      if (err) {
        reject({
          statusCode: 500,
          body: `Error parsing form data: ${err.message}`
        });
        return;
      }

      const audioFile = files.audio;
      const tempPath = audioFile.path;

      // Process the audio file using your Python script
      exec(`python3 process_audio.py ${tempPath}`, (error, stdout, stderr) => {
        if (error) {
          reject({
            statusCode: 500,
            body: `Error processing audio: ${stderr}`
          });
        } else {
          const processedFilePath = tempPath.replace('.mp3', '_processed.mp3');
          
          // Ensure the processed file exists before returning it
          if (fs.existsSync(processedFilePath)) {
            resolve({
              statusCode: 200,
              headers: { 'Content-Type': 'audio/mpeg' },
              body: fs.readFileSync(processedFilePath).toString('base64'),
              isBase64Encoded: true
            });
          } else {
            reject({
              statusCode: 500,
              body: 'Error: Processed file not found.'
            });
          }
        }
      });
    });
  });
};
