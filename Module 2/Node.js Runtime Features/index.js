/**
 * Node.js Runtime Features — Streams, Buffers & the File System
 *
 * GOAL
 * Move the SAME file two different ways and feel the difference:
 * 1) Load the whole file into memory with fs.readFile, and log its size.
 * 2) Flow the file through a stream and pipe it to a writable stream (a copy).
 *
 * Then explain, in your own words, why the stream approach is preferable for
 * large files.
 *
 * Run it with:
 * npm start
 */

const fs = require('fs');
const path = require('path');

// Absolute, OS-safe path to the sample file
const INPUT = path.join(__dirname, 'sample-data.txt');
const OUTPUT = path.join(__dirname, 'sample-copy.txt');

// ── PART 1: read the whole file into memory ──────────────────────────────
function readWholeFile() {
  fs.readFile(INPUT, (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(`readFile: loaded ${data.length} bytes into memory`);
  });
}

// ── PART 2: stream the file and copy it ─────────────────────────────────
function streamFile() {
  const readable = fs.createReadStream(INPUT);
  const writable = fs.createWriteStream(OUTPUT);

  readable.pipe(writable);

  writable.on('finish', () => {
    console.log('stream: finished copying via chunks (flat memory)');
  });
}

// ── PART 3: explain the difference ─────────────────────────────────────

// Streaming is better for large files because readFile loads the whole file
// into memory at once. A stream moves the file in small chunks, so it uses
// much less memory even when the file is very large.

// Run both approaches.
readWholeFile();
streamFile();

module.exports = {
  readWholeFile,
  streamFile,
  INPUT,
  OUTPUT
};