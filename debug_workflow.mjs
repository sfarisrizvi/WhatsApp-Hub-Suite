import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const wfResult = await client.query("SELECT id, name, nodes, edges FROM workflows WHERE is_active = true LIMIT 1");
    if (!wfResult.rows.length) { console.log("No active workflow"); return; }
    const wf = wfResult.rows[0];
    console.log(`Active workflow: "${wf.name}" id=${wf.id}\n`);
    const nodes = typeof wf.nodes === "string" ? JSON.parse(wf.nodes) : wf.nodes;
    const edges = typeof wf.edges === "string" ? JSON.parse(wf.edges) : wf.edges;

    for (const node of nodes) {
      if (node.type === "aiNode") {
        console.log(`[AI NODE] label="${node.data.label}"`);
        console.log(`  prompt: ${JSON.stringify(node.data.prompt).substring(0,400)}`);
        console.log(`  systemMessage: ${JSON.stringify(node.data.systemMessage||"").substring(0,300)}\n`);
      }
      if (node.type === "switchNode") {
        console.log(`[SWITCH NODE] label="${node.data.label}"`);
        const rules = node.data.rules || [];
        for (const r of rules) console.log(`  if(${r.value1}) ${r.operator} (${r.value2}) => handle=${r.handleName}`);
        const swEdges = edges.filter(e=>e.source===node.id);
        for (const e of swEdges) {
          const t = nodes.find(n=>n.id===e.target);
          console.log(`  edge sourceHandle="${e.sourceHandle}" => "${t?.data?.label||e.target}"`);
        }
        console.log();
      }
      if (node.type === "messageNode") {
        console.log(`[MSG NODE] label="${node.data.label}" type=${node.data.messageType}`);
        console.log(`  body: ${JSON.stringify(node.data.messageBody||"").substring(0,200)}\n`);
      }
    }
  } finally { client.release(); await pool.end(); }
}
main().catch(e => { console.error(e.message); process.exit(1); });
