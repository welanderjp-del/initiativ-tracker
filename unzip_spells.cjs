const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Since we can't use unzip, let's try to use a node package if possible, 
// or just check if we can use 'jar' which is sometimes available in java envs
// but this is a node env.

// Let's try to use 'npx decompress-cli'
try {
    console.log('Attempting to unzip using decompress-cli...');
    execSync('npx -y decompress-cli ./public/data/spells.zip --out-dir ./public/data/', { stdio: 'inherit' });
    console.log('Unzip successful.');
} catch (error) {
    console.error('Unzip failed:', error.message);
}
