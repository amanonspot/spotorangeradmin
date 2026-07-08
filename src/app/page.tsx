"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, IndianRupee, ListChecks, Rocket, Users } from "lucide-react";

import { AdminShell } from "@/components/admin-shell/admin-shell";
import { StatCard } from "@/components/admin-shell/stat-card";
import { SubmissionsTable } from "@/components/admin-shell/submissions-table";
import { getStats, listSubmissions, type AdminStats, type SubmissionRow } from "@/lib/api/admin";
import { useSession } from "@/lib/auth/session";
import { formatInr } from "@/lib/format";

function DashboardContent() {
  const { session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recent, setRecent] = useState<SubmissionRow[]>([]);

  useEffect(() => {
    getStats().then(setStats).catch(() => setStats(null));
    listSubmissions().then((all) => setRecent(all.slice(0, 5))).catch(() => setRecent([]));
  }, []);

  const firstName = session?.user.fullName?.split(" ")[0] ?? "Admin";

  return (
    <>
      <header className="pb-5">
        <p className="text-sm font-medium text-spoto-muted">Hello {firstName}</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-spoto-ink">Admin dashboard</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Pending review" value={stats?.pendingReview ?? 0} icon={ClipboardCheck} accent="amber" />
        <StatCard label="Verified" value={stats?.verified ?? 0} icon={ListChecks} accent="purple" />
        <StatCard label="Listed live" value={stats?.listed ?? 0} icon={Rocket} accent="purple" />
        <StatCard label="Rewards paid" value={formatInr(stats?.rewardsPaid ?? 0)} icon={IndianRupee} accent="green" />
        <StatCard label="Active rangers" value={stats?.activeRangers ?? 0} icon={Users} accent="purple" />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Recent submissions</h2>
          <Link className="text-sm font-heading font-semibold text-spoto-green" href="/submissions">
            View all
          </Link>
        </div>
        <SubmissionsTable rows={recent} />
      </section>
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <DashboardContent />
    </AdminShell>
  );
}
