import { NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";

// GET /api/tickets/[id] — Fetch a single ticket with messages
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = parseInt(id, 10);

    if (isNaN(ticketId)) {
      return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
    }

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("[TICKET_GET_BY_ID]", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] — Delete a ticket (user can only delete their own)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = parseInt(id, 10);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (isNaN(ticketId) || !userId) {
      return NextResponse.json(
        { error: "Invalid ticket ID or missing userId" },
        { status: 400 }
      );
    }

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.userId !== parseInt(userId)) {
      return NextResponse.json(
        { error: "Unauthorized: You can only delete your own tickets" },
        { status: 403 }
      );
    }

    await db.ticket.delete({ where: { id: ticketId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TICKET_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
