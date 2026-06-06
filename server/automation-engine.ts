import { db } from "./db";
import { workflows, workflowRuns, workflowNodeLogs, contacts, conversations, messages, containers } from "../shared/schema";
import { storage } from "./storage";
import { eq, and, gt } from "drizzle-orm";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

export async function executeWorkflow(workflowId: string, payload: any, isTestRun: boolean = false) {
  console.log(`[Engine] Executing V2 Workflow ${workflowId} (Test: ${isTestRun})`);

  // 1. Fetch Workflow
  const wf = await db.query.workflows.findFirst({
    where: eq(workflows.id, workflowId),
  });

  if (!wf) throw new Error("Workflow not found");
  if (!wf.isActive && !isTestRun) {
    console.log("[Engine] Workflow inactive, aborting.");
    return { status: "aborted", reason: "inactive" };
  }

  // Find Nodes
  const triggerNode = (wf.nodes as any[]).find((n) => n.type === "triggerNode");
  const aiNode = (wf.nodes as any[]).find((n) => n.type === "aiNode");
  const messageNode = (wf.nodes as any[]).find((n) => n.type === "messageNode");
  const actionNode = (wf.nodes as any[]).find((n) => n.type === "actionNode");

  let runId = "test-run";
  if (!isTestRun) {
    const [run] = await db.insert(workflowRuns).values({
      workflowId,
      containerId: wf.containerId,
      status: "running",
      triggerPayload: payload,
    }).returning();
    runId = run.id;
  }

  try {
    // Stage 1: Trigger Data Ingestion & DB Memory Handling
    const sessionContext = payload.session || {};
    const messageBody = payload.message?.body || "No message provided.";

    // 1. Resolve Contact
    let contactPhone = payload.message?.from || "sandbox_test_phone";
    let contactName = payload.message?.from_name || "Guest";
    
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.containerId, wf.containerId),
        eq(contacts.phone, contactPhone)
      )
    });
    
    if (!contact) {
      [contact] = await db.insert(contacts).values({
        containerId: wf.containerId,
        name: contactName,
        phone: contactPhone,
      }).returning();
    } else if (payload.message?.from_name && contact.name !== payload.message.from_name) {
      await db.update(contacts).set({ name: payload.message.from_name }).where(eq(contacts.id, contact.id));
      contact.name = payload.message.from_name;
    }

    // 2. Resolve Conversation
    let conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.containerId, wf.containerId),
        eq(conversations.contactId, contact.id)
      )
    });
    
    if (!conversation) {
      [conversation] = await db.insert(conversations).values({
        containerId: wf.containerId,
        contactId: contact.id,
        status: "open",
      }).returning();
    }

    // 3. Save User Message to DB (only for sandbox test runs)
    if (isTestRun) {
      await db.insert(messages).values({
        conversationId: conversation.id,
        content: messageBody,
        isFromContact: true,
      });
    }

    // 4. Retrieve Messages from the Last 1 Hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dbMessages = await db.query.messages.findMany({
      where: and(
        eq(messages.conversationId, conversation.id),
        gt(messages.createdAt, oneHourAgo)
      ),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)]
    });

    const historyMessages = dbMessages.slice(0, dbMessages.length - 1);
    
    // Stage 2: AI Processor
    let aiOutput: any = null;
    if (aiNode) {
      const modelName = aiNode.data?.llmConfig?.model || "gpt-4o";
      const temperature = aiNode.data?.llmConfig?.temperature || 0.7;
      const systemPrompt = aiNode.data?.prompt || "You are a helpful assistant. Extract required entities and provide a conversational reply.";
      
      const apiKey = aiNode.data?.llmConfig?.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === "dummy") {
        throw new Error("Missing OpenAI API Key. Please configure it in the AI Node.");
      }
      const llm = new ChatOpenAI({
        modelName: modelName,
        temperature: temperature,
        apiKey: apiKey, 
      });

      // We enforce strict JSON output
      const schema = z.object({
        ai_processing: z.object({
          detected_intent: z.string().describe("The primary intent of the user's message"),
          response_generation: z.object({
            reply_text: z.string().describe("The conversational response to send back to the user"),
            requires_human_handoff: z.boolean().describe("Whether this needs human attention"),
          }),
          extracted_entities: z.record(z.any()).describe("Any requested fields mapped from the user input"),
        })
      });

      const parser = StructuredOutputParser.fromZodSchema(schema);
      const formatInstructions = parser.getFormatInstructions();

      const messagesList: any[] = [];
      
      // 1. System Prompt + Format Instructions with Name Context
      const nameContext = contact.name && contact.name !== "sandbox_test_phone" && contact.name !== "Guest"
        ? `The customer's name is ${contact.name}. You should address them by their name when appropriate.`
        : `The customer's name is not specified or verified. Use polite fallback pronouns or address them generally.`;
        
      const systemContent = `Customer Context:
- ${nameContext}
- Current Time: ${new Date().toLocaleString()}

System Instructions:
${systemPrompt}

${formatInstructions}`;
      messagesList.push(new SystemMessage(systemContent));

      // 2. Chat History
      for (const msg of historyMessages) {
        if (msg.isFromContact) {
          messagesList.push(new HumanMessage(msg.content));
        } else {
          messagesList.push(new AIMessage(msg.content));
        }
      }

      // 3. Current User Message (appending format instructions to prevent the model from forgetting to output JSON on later turns)
      const userContentWithInstructions = `${messageBody}\n\n${formatInstructions}`;
      messagesList.push(new HumanMessage(userContentWithInstructions));

      try {
        const response = await llm.invoke(messagesList);
        aiOutput = await parser.parse(response.content as string);
        console.log("[Engine] AI Output generated:", JSON.stringify(aiOutput, null, 2));
      } catch (err: any) {
        console.error("[Engine] LLM Error:", err.message);
        aiOutput = {
          ai_processing: {
            detected_intent: "error",
            response_generation: { 
              reply_text: "I encountered an error processing your request.",
              requires_human_handoff: true
            },
            extracted_entities: {}
          }
        };
      }
    } else {
      // Mock AI output if no node found
      aiOutput = {
        ai_processing: {
          response_generation: { reply_text: "Echo: " + messageBody },
          extracted_entities: {}
        }
      };
    }

    // Stage 3 & 4
    let finalTestResponse = aiOutput.ai_processing.response_generation.reply_text;

    // Save Bot Response to DB
    await db.insert(messages).values({
      conversationId: conversation.id,
      content: finalTestResponse,
      isFromContact: false,
    });

    // Output & Routing (Send Message Node)
    if (messageNode && !isTestRun) {
      console.log(`[Engine] Sending Message to Meta: ${finalTestResponse}`);
      const container = await db.query.containers.findFirst({
        where: eq(containers.id, wf.containerId),
      });
      if (container?.isConfigured && container.phoneNumberId && container.apiKey) {
        try {
          const recipientPhone = contact.phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
          const endpoint = container.apiEndpoint || "https://graph.facebook.com/v18.0/";
          const url = `${endpoint.replace(/\/$/, "")}/${container.phoneNumberId}/messages`;
          
          const waRes = await fetch(url, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${container.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: recipientPhone,
              type: "text",
              text: { preview_url: false, body: finalTestResponse },
            }),
          });
          const waData = await waRes.json();
          console.log("[Engine] WhatsApp send response:", waRes.status, JSON.stringify(waData).slice(0, 300));
        } catch (waErr: any) {
          console.error("[Engine] WhatsApp send failed:", waErr.message);
        }
      }
    }

    // Operation Node (DB Action)
    if (actionNode) {
      const extracted = aiOutput.ai_processing.extracted_entities;
      console.log(`[Engine] Executing Action with entities:`, extracted);
      
      if (actionNode.data?.targetTable === "crm_orders" || actionNode.data?.targetTable === "orders") {
        try {
          // Check if we have order number or items to book
          if (extracted.order_number || extracted.items || extracted.total_amount) {
            const orderNumber = extracted.order_number || `ORD-${Date.now().toString().slice(-6)}`;
            
            let orderItems = extracted.items || [];
            if (typeof orderItems === "string") {
              orderItems = [{ name: orderItems, quantity: 1 }];
            } else if (!Array.isArray(orderItems)) {
              orderItems = [orderItems];
            }

            const totalAmount = extracted.total_amount 
              ? Math.round(Number(extracted.total_amount)) 
              : 0;

            await storage.createOrder({
              containerId: wf.containerId,
              contactId: contact.id,
              orderNumber: orderNumber,
              items: orderItems,
              totalAmount: totalAmount,
              status: "pending"
            });
            console.log(`[Engine] Order logged to CRM successfully: ${orderNumber}`);
          }
        } catch (err: any) {
          console.error("[Engine] Failed to write order to database:", err.message);
        }
      }
    }

    const updatedDbMessages = await db.query.messages.findMany({
      where: and(
        eq(messages.conversationId, conversation.id),
        gt(messages.createdAt, oneHourAgo)
      ),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)]
    });

    const finalHistory = updatedDbMessages.map(msg => ({
      role: msg.isFromContact ? "user" : "bot",
      content: msg.content
    }));

    if (!isTestRun) {
      await db.update(workflowRuns).set({
        status: "completed",
        endTime: new Date(),
      }).where(eq(workflowRuns.id, runId));
    }

    return { runId, testOutput: finalTestResponse, history: finalHistory };

  } catch (error: any) {
    if (!isTestRun) {
      await db.update(workflowRuns).set({
        status: "failed",
        error: error.message,
        endTime: new Date(),
      }).where(eq(workflowRuns.id, runId));
    }
    throw error;
  }
}
