const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

exports.handler = async (event, context) => {
  try {
    // Log the incoming event
    console.log('Event received:', event);

    const form = new formidable.IncomingForm();
    form.uploadDir = '/tmp'; // Directory for file uploads
    form.keepExtensions = true; // Keep file extensions

    // Handle the form data
    const { files } = await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          reject(err);
        } else {
          console.log('Parsed files:', files);
          resolve({ files });
        }
      });
    });

    const audioFile = files.audio;

    // Log details about the uploaded file
    console.log('Uploaded file details:', audioFile);

    if (!audioFile) {
      return {
        statusCode: 400,
        body: 'No audio file uploaded'
      };
    }

    // Move file to /tmp directory
    const tempPath = path.join('/tmp', path.basename(audioFile.filepath));
    fs.renameSync(audioFile.filepath, tempPath);

    // Log the path to the file being processed
    console.log('Processing file at:', tempPath);

    // Process the audio file
    await new Promise((resolve, reject) => {
      exec(`python3 process_audio.py ${tempPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error('Audio processing error:', stderr);
          reject(`Audio processing error: ${stderr}`);
        } else {
          console.log('Audio processing output:', stdout);
          resolve(stdout);
        }
      });
    });

    // Return the processed file
    const processedFilePath = tempPath.replace('.mp3', '_processed.mp3');

    if (fs.existsSync(processedFilePath)) {
      console.log('Processed file found at:', processedFilePath);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
        body: fs.readFileSync(processedFilePath).toString('base64'),
        isBase64Encoded: true
      };
    } else {
      console.error('Processed file not found:', processedFilePath);
      return {
        statusCode: 500,
        body: 'Processed file not found'
      };
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return {
      statusCode: 500,
      body: `Unexpected error: ${error.message}`
    };
  }
};
