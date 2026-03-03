import { db } from "./db";
import { containers } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDatabase(userId: string) {
  const existing = await db.select().from(containers).where(eq(containers.ownerId, userId));
  if (existing.length > 0) return;

  const [container] = await db.insert(containers).values({
    name: "My Workspace",
    isConfigured: false,
    ownerId: userId,
  }).returning();

  const { containerMembers } = await import("@shared/schema");
  await db.insert(containerMembers).values({
    containerId: container.id,
    userId: userId,
    role: "admin",
  });

  console.log("Default workspace created for user:", userId);
}
