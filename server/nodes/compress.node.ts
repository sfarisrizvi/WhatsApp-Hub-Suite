import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node";
import AdmZip from "adm-zip";

export class CompressNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;
    const config = this.evaluateNodeData(data, context);

    const operation = config.operation || "compress";
    const binaryPropertyName = config.binaryPropertyName || "data";
    const fileName = config.fileName || "archive.zip";
    const inputBinaryProperty = config.inputBinaryProperty || "data";

    try {
      if (operation === "compress") {
        const zip = new AdmZip();
        
        // Check if we are compressing a binary from context
        const binaryData = context.$binary?.[inputBinaryProperty];
        if (binaryData) {
          zip.addFile(binaryData.fileName || "file.bin", binaryData.data);
        } else {
          // Compress JSON data
          const jsonData = config.data || {};
          const jsonString = typeof jsonData === "string" ? jsonData : JSON.stringify(jsonData, null, 2);
          zip.addFile("data.json", Buffer.from(jsonString, "utf8"));
        }

        const zipBuffer = zip.toBuffer();

        return {
          status: "success",
          data: { status: "compressed" },
          binary: {
            [binaryPropertyName]: {
              data: zipBuffer,
              mimeType: "application/zip",
              fileName: fileName,
            }
          },
          nextEdges: outgoingEdges.map((e) => e.id),
        };
      } 
      else if (operation === "extract") {
        const binaryData = context.$binary?.[inputBinaryProperty];
        if (!binaryData || !binaryData.data) {
          throw new Error(`No binary data found at $binary.${inputBinaryProperty}`);
        }

        const zip = new AdmZip(binaryData.data);
        const zipEntries = zip.getEntries();
        
        if (zipEntries.length === 0) {
          throw new Error("Zip archive is empty");
        }

        // Just extract the first file for simplicity in this version
        const firstEntry = zipEntries[0];
        const extractedBuffer = firstEntry.getData();

        // If it's a JSON file, try to parse it to $json as well
        let parsedJson = null;
        if (firstEntry.entryName.endsWith(".json")) {
          try {
            parsedJson = JSON.parse(extractedBuffer.toString("utf8"));
          } catch (e) {
            // Ignore parse errors, just keep it as binary
          }
        }

        return {
          status: "success",
          data: parsedJson ? { extractedData: parsedJson } : { status: "extracted" },
          binary: {
            [binaryPropertyName]: {
              data: extractedBuffer,
              mimeType: "application/octet-stream", // Fallback mime type
              fileName: firstEntry.entryName,
            }
          },
          nextEdges: outgoingEdges.map((e) => e.id),
        };
      }

      throw new Error(`Unknown compression operation: ${operation}`);
    } catch (err: any) {
      return {
        status: "failed",
        error: `Compress operation failed: ${err.message}`,
      };
    }
  }
}
