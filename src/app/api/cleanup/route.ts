import { NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";

// POST /api/cleanup — Auto-delete feedback and petitions older than 21 days
// This can be called by a cron job or on page load
export async function POST() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 21);

    const [deletedFeedback, deletedPetitions] = await Promise.all([
      db.feedback.deleteMany({
        where: { createdAt: { lt: cutoff } },
      }),
      db.petition.deleteMany({
        where: { createdAt: { lt: cutoff } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      deletedFeedback: deletedFeedback.count,
      deletedPetitions: deletedPetitions.count,
    });
  } catch (error) {
    console.error("[CLEANUP_POST]", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
