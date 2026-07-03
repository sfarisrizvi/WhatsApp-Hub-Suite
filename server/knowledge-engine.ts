import { db } from "./db";
import { knowledgeChunks, knowledgeDocuments } from "../shared/schema";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFParse } from "pdf-parse";
import { eq, sql } from "drizzle-orm";

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small", 
});

export async function processDocument(documentId: string, fileBuffer: Buffer, mimetype: string) {
  try {
    let text = "";
    if (mimetype === "application/pdf") {
      const parser = new PDFParse({ data: fileBuffer });
      const data = await parser.getText();
      text = data.text;
    } else {
      text = fileBuffer.toString("utf8");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("No text could be extracted from the document.");
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const chunks = await splitter.createDocuments([text]);
    
    // Process chunks in batches to avoid OpenAI rate limits
    const batchSize = 50;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c: any) => c.pageContent);
      
      const vectors = await embeddings.embedDocuments(texts);
      
      const insertData = batch.map((chunk: any, idx: number) => ({
        documentId,
        content: chunk.pageContent,
        embedding: vectors[idx],
        metadata: chunk.metadata,
      }));
      
      if (insertData.length > 0) {
        await db.insert(knowledgeChunks).values(insertData);
      }
    }
    
    await db.update(knowledgeDocuments)
      .set({ status: "ready" })
      .where(eq(knowledgeDocuments.id, documentId));
      
  } catch (error: any) {
    console.error("Error processing document:", error);
    await db.update(knowledgeDocuments)
      .set({ status: "failed" })
      .where(eq(knowledgeDocuments.id, documentId));
  }
}

export async function querySimilarChunks(baseId: string, query: string, limit: number = 3) {
  try {
    const queryEmbedding = await embeddings.embedQuery(query);
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    
    // Uses pgvector <=> operator for cosine distance
    const result = await db.execute(sql`
      SELECT c.content, c.metadata, (c.embedding <=> ${embeddingString}::vector) as distance
      FROM knowledge_chunks c
      JOIN knowledge_documents d ON c.document_id = d.id
      WHERE d.base_id = ${baseId} AND d.status = 'ready'
      ORDER BY distance ASC
      LIMIT ${limit};
    `);
    
    return result.rows;
  } catch (err: any) {
    console.error("Vector query error:", err.message);
    return [];
  }
}
