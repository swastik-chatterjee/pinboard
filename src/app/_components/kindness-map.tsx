"use client";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { api } from "~/trpc/react";
import { snap } from "~/lib/snap";

type Bounds = { north: number; south: number; east: number; west: number };
type Post = { id: string; message: string; firstName: string; lat: number; lng: number; hearts: number; createdAt: Date };

const [LAT, LNG] = (process.env.NEXT_PUBLIC_MAP_CENTER ?? "22.5726,88.3639").split(",").map(Number) as [number, number];
const pinIcon = L.divIcon({ html: "<span style='font-size:26px'>💛</span>", className: "", iconSize: [28, 28], iconAnchor: [14, 14] });
const hereIcon = L.divIcon({ html: "<span style='font-size:30px'>📍</span>", className: "", iconSize: [30, 30], iconAnchor: [15, 28] });

const ago = (d: Date) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

function Viewport({ onBounds, onPick }: { onBounds: (b: Bounds) => void; onPick: (p: [number, number]) => void }) {
  const map = useMap();
  const read = () => { const b = map.getBounds(); onBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() }); };
  useEffect(read, []); // eslint-disable-line react-hooks/exhaustive-deps
  useMapEvents({ moveend: read, click: (e) => onPick([snap(e.latlng.lat), snap(e.latlng.lng)]) });
  return null;
}

function Pins({ posts, onSelect }: { posts: Post[]; onSelect: (p: Post) => void }) {
  const map = useMap();
  useEffect(() => {
    const group = L.markerClusterGroup();
    posts.forEach((p) => group.addLayer(L.marker([p.lat, p.lng], { icon: pinIcon, title: p.firstName || "A neighbor" }).on("click", () => onSelect(p))));
    map.addLayer(group);
    return () => { map.removeLayer(group); };
  }, [posts, map, onSelect]);
  return null;
}

export default function KindnessMap() {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [debounced, setDebounced] = useState<Bounds | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [pick, setPick] = useState<[number, number] | null>(null);
  const [selected, setSelected] = useState<Post | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [warmed, setWarmed] = useState<Set<string>>(new Set());
  const [reported, setReported] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(bounds), 300); return () => clearTimeout(t); }, [bounds]);
  // round the box to 2 decimals so near-identical views share a cache entry
  const key = useMemo(() => debounced && Object.fromEntries(Object.entries(debounced).map(([k, v]) => [k, Math.round(v * 100) / 100])) as Bounds, [debounced]);

  const utils = api.useUtils();
  const nearby = api.kindness.getNearby.useQuery(key!, { enabled: !!key, staleTime: 30_000 });
  const create = api.kindness.create.useMutation({
    onSuccess: ({ post, secret }) => { setSecret(secret); setSelected(post); setPick(null); setMessage(""); void utils.kindness.getNearby.invalidate(); },
  });
  const heart = api.kindness.heart.useMutation({ onSuccess: () => void utils.kindness.getNearby.invalidate() });
  const report = api.kindness.report.useMutation({ onSuccess: () => setReported(true) });

  const posts = (nearby.data?.posts ?? []) as Post[];
  const select = (p: Post) => { setSelected(p); setReported(false); setPick(null); };

  return (
    <main className="relative flex h-dvh flex-col bg-[#eef3e8] text-[#1f2a44]">
      <header className="z-[1000] flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <h1 className="text-xl font-bold">Pinboard</h1>
          <p className="text-base">One kind act at a time, on one shared map.</p>
        </div>
        <button className="min-h-11 rounded-full bg-[#1f2a44] px-5 text-base font-semibold text-white" onClick={() => setView(view === "map" ? "list" : "map")}>
          {view === "map" ? "Show list" : "Show map"}
        </button>
      </header>

      <section className="relative flex-1" aria-label={`Map showing ${posts.length} kindness pins`}>
        <div className={view === "map" ? "h-full" : "hidden"}>
          <MapContainer center={[LAT, LNG]} zoom={14} className="h-full w-full" keyboard>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
            <Viewport onBounds={setBounds} onPick={(p) => { setPick(p); setSelected(null); setSecret(null); }} />
            <Pins posts={posts} onSelect={select} />
            {pick && <Marker position={pick} icon={hereIcon} />}
          </MapContainer>
        </div>

        {view === "list" && (
          <ul className="h-full space-y-3 overflow-y-auto p-4">
            {posts.map((p) => (
              <li key={p.id} className="rounded-2xl bg-white p-4 text-base shadow-sm">
                <p>{p.message}</p>
                <p className="mt-1 text-sm opacity-70">{p.firstName || "A neighbor"} · {ago(p.createdAt)} · {p.hearts} 💛</p>
              </li>
            ))}
          </ul>
        )}

        {nearby.data?.tooWide && <p className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-base shadow">Zoom in to see kindness nearby.</p>}
        {!nearby.isLoading && !nearby.data?.tooWide && posts.length === 0 && !pick && (
          <p className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-base shadow">No kindness here yet. Tap the map to plant some.</p>
        )}

        {(pick || selected || secret) && (
          <div className="absolute inset-x-0 bottom-0 z-[1000] max-h-[70%] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl" role="dialog" aria-live="polite">
            {pick && (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate({ message, firstName: name || undefined, lat: pick[0], lng: pick[1] }); }}>
                <p className="text-base">We moved your pin to the nearest block so homes stay private.</p>
                <label className="block text-base font-semibold">What kind thing happened?
                  <textarea required minLength={10} maxLength={280} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-[#1f2a44]/30 p-3 text-base" rows={3} />
                </label>
                <label className="block text-base font-semibold">First name or nickname (optional)
                  <input maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="A neighbor" className="mt-1 w-full rounded-xl border-2 border-[#1f2a44]/30 p-3 text-base" />
                </label>
                {create.error && <p role="alert" className="text-base font-semibold text-red-700">{create.error.message}</p>}
                <div className="flex gap-3">
                  <button disabled={create.isPending} className="min-h-11 flex-1 rounded-full bg-[#e0a800] px-5 text-base font-bold text-[#1f2a44]">{create.isPending ? "Posting…" : "Post this kindness"}</button>
                  <button type="button" onClick={() => setPick(null)} className="min-h-11 px-4 text-base underline">Cancel</button>
                </div>
              </form>
            )}
            {!pick && secret && (
              <div className="mb-4 rounded-2xl bg-[#fff6d6] p-4 text-base">
                <p className="font-bold">Screenshot this now. It is never shown again.</p>
                <p className="mt-1 break-all font-mono text-lg">{secret}</p>
                <p className="mt-1">With this secret you can edit or delete your post later.</p>
              </div>
            )}
            {!pick && selected && (
              <div className="space-y-3">
                <p className="text-lg">{selected.message}</p>
                <p className="text-base opacity-70">{selected.firstName || "A neighbor"} · {ago(selected.createdAt)} · {selected.hearts + (warmed.has(selected.id) ? 1 : 0)} 💛</p>
                <div className="flex flex-wrap gap-3">
                  <button disabled={warmed.has(selected.id)} onClick={() => { setWarmed(new Set(warmed).add(selected.id)); heart.mutate({ postId: selected.id }); }} className="min-h-11 rounded-full bg-[#e0a800] px-5 text-base font-bold">
                    {warmed.has(selected.id) ? "Warmed" : "Sprout a heart"}
                  </button>
                  <button disabled={reported} onClick={() => report.mutate({ postId: selected.id, reason: "Breaks the rules" })} className="min-h-11 px-4 text-base underline">
                    {reported ? "Thanks, we'll take a look" : "Report"}
                  </button>
                  <button onClick={() => { setSelected(null); setSecret(null); }} className="min-h-11 px-4 text-base underline">Close</button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      <footer className="bg-[#eef3e8] px-4 py-2 text-sm">
        Pinboard stores no email, no account, and no exact location. Never share your school, address, phone number, or full name in a post.
      </footer>
    </main>
  );
}
