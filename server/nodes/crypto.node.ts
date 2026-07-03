import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node";
import crypto from "crypto";

export class CryptoNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;
    const config = this.evaluateNodeData(data, context);

    const operation = config.operation || "hash";
    const algorithm = config.algorithm || "sha256";
    const inputData = config.data || "";
    const secret = config.secret || "";
    const outputProperty = config.outputProperty || "cryptoResult";

    let resultValue: string = "";

    try {
      if (operation === "hash") {
        const hash = crypto.createHash(algorithm);
        hash.update(inputData);
        resultValue = hash.digest("hex");
      } 
      else if (operation === "hmac") {
        const hmac = crypto.createHmac(algorithm, secret);
        hmac.update(inputData);
        resultValue = hmac.digest("hex");
      } 
      else if (operation === "encrypt") {
        // AES-256-CBC requires a 32-byte key and 16-byte IV
        // We will generate a random IV and prepend it to the ciphertext
        const key = crypto.createHash("sha256").update(secret).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        let encrypted = cipher.update(inputData, "utf8", "hex");
        encrypted += cipher.final("hex");
        resultValue = iv.toString("hex") + ":" + encrypted;
      } 
      else if (operation === "decrypt") {
        const key = crypto.createHash("sha256").update(secret).digest();
        const parts = inputData.split(":");
        if (parts.length !== 2) throw new Error("Invalid encrypted data format");
        const iv = Buffer.from(parts[0], "hex");
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");
        resultValue = decrypted;
      }

      return {
        status: "success",
        data: { [outputProperty]: resultValue },
        nextEdges: outgoingEdges.map((e) => e.id),
      };
    } catch (err: any) {
      return {
        status: "failed",
        error: `Crypto operation failed: ${err.message}`,
      };
    }
  }
}
