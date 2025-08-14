// * Make sure to export the firebase config object from firebaseConfig.js in the project root

const fs = require('fs');
const path = require('path');

const firebaseConfig = require('../firebaseConfig');

const envFileName = '.env';
// This line now resolves the path one directory up from the current script's location
const envFilePath = path.resolve(__dirname, '..', envFileName);

// Helper function to convert camelCase to SCREAMING_SNAKE_CASE
function camelCaseToSnakeCase(name) {
  return name.replace(/([A-Z])/g, '_$1').toUpperCase();
}

function generateEnvContent(config) {
  let envContent = '';
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      const snakeCaseKey = camelCaseToSnakeCase(key);
      const envKey = `REACT_APP_FIREBASE_${snakeCaseKey}`;
      envContent += `${envKey}=${config[key]}\n`;
    }
  }
  return envContent;
}

function writeEnvFile(content) {
  fs.writeFileSync(envFilePath, content, { encoding: 'utf8' });
  console.log(`Firebase configuration written to ${envFileName} in the parent directory.`);
}

const envContent = generateEnvContent(firebaseConfig);
writeEnvFile(envContent);
