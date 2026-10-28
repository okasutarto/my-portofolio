const fs = require('fs').promises;
const path = require('path');

// The CV only changes on deploy, so it's read once; a failed read is retried next time
let cachedCV = null;

async function loadCV() {
  if (cachedCV) return cachedCV;
  try {
    // Go up two levels from src/utils to root of my-portfolio-api, then to assets
    const cvPath = path.join(__dirname, '../../assets', 'OkaSutartoCV.txt');
    cachedCV = await fs.readFile(cvPath, 'utf8');
    return cachedCV;
  } catch (error) {
    console.error('Error loading CV:', error);
    return null;
  }
}

module.exports = { loadCV };
