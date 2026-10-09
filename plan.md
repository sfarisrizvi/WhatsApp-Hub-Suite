# Whatlify Architecture & Evolution Plan

The comprehensive architectural analysis, optimization, and scaling plan has been compiled in:
👉 [ARCHITECTURE_EVOLUTION_PLAN.md](file:///Users/quecko/Documents/Web%20Projects/Whatlify/WhatsApp-Hub-Suite/ARCHITECTURE_EVOLUTION_PLAN.md)

## Summary of Key Pillars

1. **Decouple Webhooks via Async Queue**: Immediate `<50ms` HTTP 200 acknowledgment to Meta to prevent timeout loops and OpenAI cost explosions.
2. **Execution Hardening**: Replace Node.js `vm.Script` in `expression-parser.ts` with sandboxed QuickJS WASM / safe AST; disable raw SQL for non-superadmins.
3. **Workflow Engine Scalability**: Replace 60s `setInterval` polling with millisecond-accurate delayed jobs; add canvas execution telemetry & step replay.
4. **pgvector Scaling**: Add HNSW indexing to `knowledge_chunks` and implement hybrid semantic + BM25 keyword search.
5. **Horizontal WebSockets**: Implement Redis Pub/Sub so multiple server replicas can broadcast messages to connected agents.
6. **Meta Campaign Guardrails**: Token-bucket rate limiter to protect WABA account health and respect daily conversation tiers.
