"use client";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function Moderate() {
  const [pass, setPass] = useState("");
  const list = api.moderate.list.useQuery(undefined, { retry: false });
  const login = api.moderate.login.useMutation({ onSuccess: () => void list.refetch() });
  const resolve = api.moderate.resolve.useMutation({ onSuccess: () => void list.refetch() });

  if (list.error) {
    return (
      <form className="mx-auto max-w-sm space-y-3 p-6" onSubmit={(e) => { e.preventDefault(); login.mutate({ passphrase: pass }); }}>
        <h1 className="text-xl font-bold">Moderator sign in</h1>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full rounded-xl border-2 p-3 text-base" aria-label="Passphrase" />
        {login.error && <p role="alert" className="text-red-700">{login.error.message}</p>}
        <button className="min-h-11 rounded-full bg-[#1f2a44] px-5 font-semibold text-white">Sign in</button>
      </form>
    );
  }
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-bold">Reported posts</h1>
      {list.data?.length === 0 && <p>Nothing to review. All quiet.</p>}
      {list.data?.map((p) => (
        <article key={p.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-base">{p.message}</p>
          <p className="text-sm opacity-70">{p.firstName || "A neighbor"} · {p.status} · {p.reports.length} report(s): {p.reports.map((r) => r.reason).join(", ")}</p>
          <div className="mt-3 flex gap-3">
            <button className="min-h-11 rounded-full bg-[#e0a800] px-4 font-semibold" onClick={() => resolve.mutate({ postId: p.id, status: "LIVE" })}>Keep live</button>
            <button className="min-h-11 rounded-full border-2 px-4" onClick={() => resolve.mutate({ postId: p.id, status: "HIDDEN" })}>Hide</button>
            <button className="min-h-11 rounded-full border-2 border-red-700 px-4 text-red-700" onClick={() => resolve.mutate({ postId: p.id, status: "DELETED" })}>Delete</button>
          </div>
        </article>
      ))}
    </main>
  );
}
