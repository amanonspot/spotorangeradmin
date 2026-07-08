"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Phone } from "lucide-react";

import { AdminShell } from "@/components/admin-shell/admin-shell";
import { ConfirmModal } from "@/components/admin-shell/modal";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoInput, SpotoTextarea } from "@/design-system/components/input";
import { StatusBadge, statusLabel } from "@/design-system/components/status-badge";
import { changeStatus, getSubmission, publishSubmission, type SubmissionDetail } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatInr } from "@/lib/format";

const BHK_LABELS: Record<string, string> = {
  "1_rk": "1 RK",
  "1_bhk": "1 BHK",
  "2_bhk": "2 BHK",
  "3_bhk": "3 BHK",
  "4_bhk_plus": "4 BHK+",
};

type ActionKind = "verify" | "need_more_information" | "duplicate" | "rejected" | "publish";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-spoto-muted">{label}</span>
      <span className="text-right font-heading text-sm font-semibold text-spoto-ink">{value}</span>
    </div>
  );
}

function SubmissionDetailContent() {
  const params = useParams<{ id: string }>();
  const [sub, setSub] = useState<SubmissionDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState<ActionKind | null>(null);
  const [reason, setReason] = useState("");
  const [reward, setReward] = useState("100");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!params?.id) return;
    getSubmission(params.id)
      .then((data) => {
        setSub(data);
        setState("ready");
        setReward(String(data.reward || 100));
      })
      .catch(() => setState("error"));
  }, [params?.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction() {
    if (!sub || !action) return;
    setBusy(true);
    try {
      if (action === "publish") {
        await publishSubmission(sub.id);
        toast.success("Published live — reward credited to ranger");
      } else if (action === "verify") {
        await changeStatus(sub.id, { status: "verified", reason, reward_amount: Number(reward) || 0 });
        toast.success("Submission verified");
      } else {
        await changeStatus(sub.id, { status: action, reason });
        toast.success(`Marked ${statusLabel(action)}`);
      }
      setAction(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <SpotoCard className="text-center text-sm text-spoto-muted">Loading…</SpotoCard>;
  if (state === "error" || !sub) return <SpotoCard className="text-center text-sm text-spoto-muted">Submission not found.</SpotoCard>;

  const isTerminal = ["reward_credited", "rejected", "duplicate"].includes(sub.status);
  const canPublish = sub.status === "verified" || sub.status === "listed_on_spoto";

  return (
    <>
      <Link href="/submissions" className="mb-4 inline-flex items-center gap-2 text-sm font-heading font-semibold text-spoto-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to submissions
      </Link>

      <header className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-spoto-muted">Submission {sub.shortId}</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-spoto-ink">{sub.buildingName}</h1>
            <p className="mt-1 text-sm text-spoto-muted">{sub.area}</p>
          </div>
          <StatusBadge status={sub.status} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Details */}
        <SpotoCard className="divide-y divide-spoto-line lg:col-span-1">
          <DetailRow label="Rent" value={formatInr(sub.rent)} />
          <DetailRow label="Deposit" value={formatInr(sub.deposit)} />
          <DetailRow label="Type" value={BHK_LABELS[sub.bhk] ?? sub.bhk} />
          <DetailRow label="Owner" value={sub.ownerName} />
          <div className="flex items-center justify-between gap-4 py-2">
            <span className="text-sm text-spoto-muted">Owner phone</span>
            <a href={`tel:${sub.ownerPhone}`} className="inline-flex items-center gap-1 font-heading text-sm font-semibold text-spoto-green">
              <Phone className="h-4 w-4" /> {sub.ownerPhone}
            </a>
          </div>
          <DetailRow label="Reward" value={sub.reward > 0 ? formatInr(sub.reward) : "—"} />
        </SpotoCard>

        {/* Ranger + timeline */}
        <SpotoCard className="lg:col-span-1">
          <h2 className="mb-3 font-heading text-base font-bold text-spoto-ink">Ranger</h2>
          <Link href={`/rangers/${sub.rangerId}`} className="block rounded-spoto bg-spoto-surface-2 p-3 hover:bg-white/5">
            <p className="font-heading text-sm font-semibold text-spoto-ink">{sub.rangerName}</p>
            <p className="text-xs text-spoto-muted">{sub.rangerPhone}</p>
          </Link>

          <h2 className="mb-3 mt-5 font-heading text-base font-bold text-spoto-ink">Timeline</h2>
          <ol className="relative ml-2 border-l border-spoto-line">
            {sub.statusHistory.map((h, i) => {
              const last = i === sub.statusHistory.length - 1;
              return (
                <li key={h.id} className="mb-4 ml-5 last:mb-0">
                  <span className={`absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-spoto-surface ${last ? "bg-spoto-green" : "bg-spoto-purple"}`} />
                  <p className="font-heading text-sm font-bold text-spoto-ink">{statusLabel(h.toStatus)}</p>
                  <p className="text-xs text-spoto-muted">{formatDate(h.changedAt)}</p>
                  {h.reason && <p className="mt-0.5 text-sm text-white/80">{h.reason}</p>}
                </li>
              );
            })}
          </ol>
        </SpotoCard>

        {/* Actions */}
        <SpotoCard className="lg:col-span-1">
          <h2 className="mb-3 font-heading text-base font-bold text-spoto-ink">Review actions</h2>
          {isTerminal ? (
            <p className="text-sm text-spoto-muted">This submission is finalized ({statusLabel(sub.status)}). No further action.</p>
          ) : (
            <div className="grid gap-3">
              {canPublish && (
                <SpotoButton variant="cta" onClick={() => setAction("publish")}>
                  Publish &amp; Reward
                </SpotoButton>
              )}
              {!canPublish && (
                <SpotoButton onClick={() => setAction("verify")}>Verify (success)</SpotoButton>
              )}
              <SpotoButton variant="secondary" onClick={() => setAction("need_more_information")}>
                Request more info
              </SpotoButton>
              <SpotoButton variant="secondary" onClick={() => setAction("duplicate")}>
                Mark duplicate
              </SpotoButton>
              <SpotoButton variant="outline" onClick={() => setAction("rejected")}>
                Reject (failed)
              </SpotoButton>
            </div>
          )}
        </SpotoCard>
      </div>

      {/* Confirmation modals */}
      <ConfirmModal
        open={action === "publish"}
        title="Publish live on Spoto?"
        description={`This lists ${sub.buildingName} live and credits ₹${sub.reward || 100} to ${sub.rangerName}'s wallet.`}
        confirmLabel="Publish & Reward"
        confirmVariant="cta"
        loading={busy}
        onConfirm={runAction}
        onCancel={() => setAction(null)}
      />
      <ConfirmModal
        open={action === "verify"}
        title="Verify submission"
        description="Approve this lead and set the reward amount."
        confirmLabel="Verify"
        loading={busy}
        onConfirm={runAction}
        onCancel={() => setAction(null)}
      >
        <label className="grid gap-2">
          <span className="text-sm font-heading font-semibold text-spoto-ink">Reward amount (₹)</span>
          <SpotoInput inputMode="numeric" value={reward} onChange={(e) => setReward(e.target.value.replace(/\D/g, ""))} />
        </label>
      </ConfirmModal>
      <ConfirmModal
        open={action === "need_more_information" || action === "duplicate" || action === "rejected"}
        title={action ? `Mark ${statusLabel(action)}` : ""}
        description="Add a note for the ranger (optional)."
        confirmLabel="Confirm"
        confirmVariant="outline"
        loading={busy}
        onConfirm={runAction}
        onCancel={() => setAction(null)}
      >
        <SpotoTextarea placeholder="Reason / note" value={reason} onChange={(e) => setReason(e.target.value)} />
      </ConfirmModal>
    </>
  );
}

export default function SubmissionDetailPage() {
  return (
    <AdminShell>
      <SubmissionDetailContent />
    </AdminShell>
  );
}
