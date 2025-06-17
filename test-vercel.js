import { exec } from 'child_process';

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (stderr) console.log('stderr:', stderr);
      if (stdout) console.log('stdout:', stdout);
      
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

async function testVercelEnvAdd() {
  try {
    console.log('Testing Vercel env add...');
    
    // Test with echo pipe approach
    console.log('\nTesting with echo pipe:');
    await runCommand('echo "TEST_VALUE" | vercel env add TEST_VAR development');
    
    console.log('\nComplete!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testVercelEnvAdd();