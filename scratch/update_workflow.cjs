const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: "postgresql://postgres.uhtzqmdpinulburgakda:WhatsAppQuecko123@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
  });
  
  try {
    const res = await pool.query("SELECT id, name, nodes FROM workflows WHERE name LIKE '%Restaurant%' LIMIT 1");
    if (res.rows.length > 0) {
      const workflow = res.rows[0];
      const nodes = typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes;
      
      const aiNode = nodes.find(n => n.id === 'conversational_agent');
      if (aiNode) {
        aiNode.data.systemMessage = `You are a conversational restaurant assistant for 'The Charcoal Grid'. Your detailed instructions are provided in the knowledge base context. You must read them and follow the step-by-step logic EXACTLY as defined.

CRITICAL JSON SCHEMA:
You MUST ALWAYS output your response as valid JSON with the following structure:
{
  "ai_reply": "Friendly text response to send to the WhatsApp user...",
  "metadata": {
    "action": "discuss_menu" | "send_address_flow" | "show_preorder_summary" | "confirm_and_create_order" | "check_status" | "modify_order",
    "cart": { "items": [{"name": "Classic Cheeseburger", "quantity": 1}], "total_amount": 1850 },
    "address": "submitted address string if present",
    "order_number": "extracted or tracked order number if present"
  }
}`;
      }
      
      const orderNode = nodes.find(n => n.id === 'db_create_order');
      if (orderNode) {
         orderNode.data.fields = orderNode.data.fields.map(f => {
            if (f.column === 'items') {
                return { column: 'items', value: "{{ JSON.stringify($node['Incoming WhatsApp Message'].json.contact.customFields.cart.items || []) }}" };
            }
            return f;
         });
      }
      
      const addressNode = nodes.find(n => n.id === 'save_address_state');
      if (addressNode) {
         addressNode.data.fields = addressNode.data.fields.map(f => {
            if (f.column === 'custom_fields') {
                return { column: 'custom_fields', value: "{{ JSON.stringify({ cart: ($node['Incoming WhatsApp Message'].json.contact.customFields.cart || $node['conversational_agent'].json.parsed.metadata.cart), address: ($node['Incoming WhatsApp Message'].json.message.address || $node['conversational_agent'].json.parsed.metadata.address || $node['Incoming WhatsApp Message'].json.flow_payload?.address || $node['Incoming WhatsApp Message'].json.contact.customFields.address || '') }) }}" };
            }
            return f;
         });
      }
      
      await pool.query("UPDATE workflows SET nodes = $1 WHERE id = $2", [JSON.stringify(nodes), workflow.id]);
      console.log("Successfully updated the workflow definition!");
    } else {
      console.log("No workflow found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
