"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MessageSquare,
  ThumbsUp,
  ScrollText,
  Loader2,
  Star,
  Tag,
  ArrowUpRight,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

interface TicketHistory {
  id: number;
  ticketCode: string | null;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
}

interface FeedbackHistory {
  id: number;
  feedbackCode: string | null;
  type: string;
  target: string | null;
  rating: number | null;
  comment: string;
  createdAt: string;
}

interface PetitionHistory {
  id: number;
  petitionCode: string | null;
  title: string;
  description: string;
  votes: number;
  status: string;
  createdAt: string;
}

const tabs = [
  { key: "all", label: "All", icon: Clock },
  { key: "complaints", label: "Complaints", icon: MessageSquare },
  { key: "feedback", label: "Feedback", icon: ThumbsUp },
  { key: "petitions", label: "Petitions", icon: ScrollText },
] as const;

const statusStyles: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  active: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-600",
};

const priorityStyles: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const COMPLETED_STATUSES = ["RESOLVED", "REJECTED"];

// Days remaining until auto-delete (21-day rule)
function getDaysRemaining(createdAt: string): number {
  const created = new Date(createdAt);
  const expires = new Date(created);
  expires.setDate(expires.getDate() + 21);
  const diff = expires.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function HistoryPage() {
  const [tickets, setTickets] = useState<TicketHistory[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackHistory[]>([]);
  const [petitions, setPetitions] = useState<PetitionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "complaints" | "feedback" | "petitions">("all");

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<TicketHistory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`/api/user/history?userId=${user.id}`);
      const data = await res.json();
      setTickets(data.tickets || []);
      setFeedbacks(data.feedbacks || []);
      setPetitions(data.petitions || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    // Trigger cleanup on page load (feedback + petitions older than 21 days)
    fetch("/api/cleanup", { method: "POST" }).catch(() => {});
  }, [fetchHistory]);

  const handleDeleteClick = (ticket: TicketHistory) => {
    setDeleteTarget(ticket);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(
        `/api/tickets/${deleteTarget.id}?userId=${user.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      setTickets((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success(`Complaint ${deleteTarget.ticketCode || `#${deleteTarget.id}`} deleted.`);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete complaint.");
    } finally {
      setDeleting(false);
    }
  };

  const totalCount = tickets.length + feedbacks.length + petitions.length;
  const isOngoing = deleteTarget && !COMPLETED_STATUSES.includes(deleteTarget.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">My History</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track all your submissions — {totalCount} total records
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
              activeTab === tab.key ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-500"
            )}>
              {tab.key === "all" ? totalCount
                : tab.key === "complaints" ? tickets.length
                : tab.key === "feedback" ? feedbacks.length
                : petitions.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
          <p className="text-sm text-slate-400 mt-2">Loading history...</p>
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/60">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No submissions yet</p>
          <p className="text-xs text-slate-400 mt-1">Your complaints, feedback, and petitions will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Complaints */}
          {(activeTab === "all" || activeTab === "complaints") &&
            tickets.map((ticket, i) => {
              const isDone = COMPLETED_STATUSES.includes(ticket.status);
              return (
                <motion.div
                  key={`t-${ticket.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {ticket.ticketCode || `#${ticket.id}`}
                          </span>
                          <span className="text-xs text-slate-400">Complaint</span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 mt-1 truncate">{ticket.title}</h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusStyles[ticket.status])}>
                            {ticket.status.replace("_", " ")}
                          </span>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", priorityStyles[ticket.priority])}>
                            {ticket.priority}
                          </span>
                          {ticket.category && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                              <Tag className="w-3 h-3" /> {ticket.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side: date + delete */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs text-slate-400">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDeleteClick(ticket)}
                        className={cn(
                          "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all",
                          isDone
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600"
                        )}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

          {/* Feedback — no delete, show auto-delete countdown */}
          {(activeTab === "all" || activeTab === "feedback") &&
            feedbacks.map((fb, i) => {
              const daysLeft = getDaysRemaining(fb.createdAt);
              return (
                <motion.div
                  key={`f-${fb.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg text-white shrink-0">
                        <ThumbsUp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            {fb.feedbackCode || `#${fb.id}`}
                          </span>
                          <span className="text-xs text-slate-400">Feedback — {fb.type}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1 line-clamp-2">{fb.comment}</p>
                        {fb.rating && (
                          <div className="flex gap-0.5 mt-1.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={cn("w-3 h-3", s <= fb.rating! ? "fill-amber-400 text-amber-400" : "text-slate-200")}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs text-slate-400">
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                        Auto-deletes in {daysLeft}d
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

          {/* Petitions — no delete, show auto-delete countdown */}
          {(activeTab === "all" || activeTab === "petitions") &&
            petitions.map((pet, i) => {
              const daysLeft = getDaysRemaining(pet.createdAt);
              return (
                <motion.div
                  key={`p-${pet.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg text-white shrink-0">
                        <ScrollText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            {pet.petitionCode || `#${pet.id}`}
                          </span>
                          <span className="text-xs text-slate-400">Petition</span>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusStyles[pet.status])}>
                            {pet.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 mt-1 truncate">{pet.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" /> {pet.votes} vote{pet.votes !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs text-slate-400">
                        {new Date(pet.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                        Auto-deletes in {daysLeft}d
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !deleting && setDeleteTarget(null)}
            />

            {/* Modal */}
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <button
                onClick={() => !deleting && setDeleteTarget(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
                isOngoing ? "bg-orange-100" : "bg-red-100"
              )}>
                {isOngoing
                  ? <AlertTriangle className="w-6 h-6 text-orange-500" />
                  : <Trash2 className="w-6 h-6 text-red-500" />
                }
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-slate-900 text-center">
                {isOngoing ? "Problem Not Solved Yet" : "Delete Complaint?"}
              </h3>

              {/* Message */}
              {isOngoing ? (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="text-sm text-orange-700 text-center font-medium">
                    ⚠️ Your complaint is still being reviewed
                  </p>
                  <p className="text-xs text-orange-600 text-center mt-1">
                    Deleting it now means your issue will be dismissed and no longer tracked by our team.
                    Are you sure you want to continue?
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center mt-2">
                  This will permanently remove{" "}
                  <span className="font-mono font-bold text-indigo-600">
                    {deleteTarget?.ticketCode || `#${deleteTarget?.id}`}
                  </span>{" "}
                  from your history.
                </p>
              )}

              {/* Ticket preview */}
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 truncate font-medium">{deleteTarget?.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusStyles[deleteTarget?.status ?? ""])}>
                    {deleteTarget?.status?.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => !deleting && setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2",
                    isOngoing
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-red-500 hover:bg-red-600"
                  )}
                >
                  {deleting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Yes, Delete</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
