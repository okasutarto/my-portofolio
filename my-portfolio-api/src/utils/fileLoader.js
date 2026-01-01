const fs = require('fs').promises;
const path = require('path');

async function loadCV() {
  try {
    // Go up two levels from src/utils to root of my-portfolio-api, then to assets
    const cvPath = path.join(__dirname, '../../assets', 'OkaSutartoCV.txt');
    return await fs.readFile(cvPath, 'utf8');
  } catch (error) {
    console.error('Error loading CV:', error);
    return null;
  }
}

module.exports = { loadCV };
