const { spawn } = require('child_process');

console.log("Starting automated schema push (no-shell)...");
const child = spawn('npx', ['drizzle-kit', 'push'], {
  cwd: '/Users/quecko/Documents/Web Projects/WhatsApp-Hub-Suite',
  shell: false
});

child.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  if (output.includes("Is knowledge_chunks table created or renamed") || output.includes("knowledge_chunks")) {
    console.log("[Automated Response] Sending Enter to select 'create table'...");
    child.stdin.write("\n");
  }
  
  if (output.includes("Is workflow_pauses table created or renamed") || output.includes("workflow_pauses")) {
    console.log("[Automated Response] Sending Enter to select 'create table'...");
    child.stdin.write("\n");
  }

  if (output.includes("Are you sure you want to apply") || output.includes("Are you sure")) {
    console.log("[Automated Response] Sending 'y' to confirm...");
    child.stdin.write("y\n");
  }
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`Process finished with exit code ${code}`);
});
