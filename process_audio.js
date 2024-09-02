const { parse } = require('formidable');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

exports.handler = async (event, context) => {
  try {
    const form = new formidable.IncomingForm();

    return new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) {
          reject({
            statusCode: 500,
            body: `Error parsing form: ${err.message}`
          });
        }

        const audioFile = files.audio;

        if (!audioFile) {
          reject({
            statusCode: 400,
            body: 'No audio file uploaded'
          });
        }

        // Save the file locally
        const tempPath = path.join('/tmp', audioFile.name);
        fs.renameSync(audioFile.path, tempPath);

        // Process the audio file
        exec(`python3 process_audio.py ${tempPath}`, (error, stdout, stderr) => {
          if (error) {
            reject({
              statusCode: 500,
              body: `Audio processing error: ${stderr}`
            });
          }

          // Return the processed file as a response
          const processedFilePath = tempPath.replace('.mp3', '_processed.mp3');
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
              body: 'Processed file not found'
            });
          }
        });
      });
    });
  } catch (error) {
    return {
      statusCode: 500,
      body: `Unexpected error: ${error.message}`
    };
  }
};
