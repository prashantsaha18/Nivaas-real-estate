import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TYPES = ["Apartment", "Independent House", "Villa", "PG / Hostel"];

const money = (p, listing) => {
  p = Number(p);
  if (listing === "rent") return `₹${p.toLocaleString("en-IN")}/mo`;
  return p >= 1e7 ? `₹${(p / 1e7).toFixed(2)} Cr` : `₹${Math.round(p / 1e5)} L`;
};
const pin = (p) =>
  L.divIcon({ className: "", iconSize: [0, 0], html: `<span class="pin">${money(p.price, p.listing_type).replace("/mo", "")}</span>` });

function useSaved() {
  const [ids, setIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("saved") || "[]"); } catch { return []; }
  });
  const toggle = (id) =>
    setIds((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      try { localStorage.setItem("saved", JSON.stringify(next)); } catch {}
      return next;
    });
  return [ids, toggle];
}

function Fit({ items }) {
  const map = useMap();
  useEffect(() => {
    if (items.length) map.fitBounds(items.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 14 });
  }, [items, map]);
  return null;
}

function PropertyMap({ items, onPick, height }) {
  return (
    <MapContainer center={[20.5, 78.9]} zoom={5} style={{ height, width: "100%" }} scrollWheelZoom={false}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
      <Fit items={items} />
      {items.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pin(p)} eventHandlers={onPick ? { click: () => onPick(p) } : {}} />
      ))}
    </MapContainer>
  );
}

function Card({ p, saved, onSave, onOpen }) {
  return (
    <article className="card">
      <button className="img" onClick={() => onOpen(p)} aria-label={`View ${p.title}`}>
        <img src={p.images[0]} alt="" loading="lazy" />
      </button>
      <button className={"save" + (saved ? " on" : "")} onClick={() => onSave(p.id)} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save property"}>
        {saved ? "♥" : "♡"}
      </button>
      <div className="body" onClick={() => onOpen(p)}>
        <strong className="price">{money(p.price, p.listing_type)}</strong>
        <h3>{p.title}</h3>
        <p className="muted">{p.locality}, {p.city}</p>
        <p className="meta">{p.type} · {p.bedrooms} bed · {p.area_sqft} sq ft</p>
      </div>
    </article>
  );
}

function Gallery({ images }) {
  const [i, setI] = useState(0);
  const go = (d) => setI((i + d + images.length) % images.length);
  return (
    <div className="gallery">
      <div className="stage">
        <img src={images[i]} alt={`Photo ${i + 1} of ${images.length}`} />
        <button className="nav l" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
        <button className="nav r" onClick={() => go(1)} aria-label="Next photo">›</button>
      </div>
      <div className="thumbs">
        {images.map((src, n) => (
          <button key={src} className={n === i ? "on" : ""} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`}>
            <img src={src} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Contact({ p }) {
  const [s, setS] = useState({ name: "", phone: "", message: "" });
  const [state, setState] = useState({ status: "idle", error: "", owner: null });
  const submit = async (e) => {
    e.preventDefault();
    setState({ status: "sending", error: "", owner: null });
    try {
      const r = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: p.id, ...s }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setState({ status: "sent", error: "", owner: d });
    } catch (err) {
      setState({ status: "idle", error: err.message || "Could not send. Try again.", owner: null });
    }
  };
  if (state.status === "sent")
    return (
      <div className="sent">
        <strong>Enquiry sent.</strong>
        <p>{state.owner.owner_name} will get back to you. To call now: <a href={`tel:${state.owner.owner_phone}`}>{state.owner.owner_phone}</a></p>
      </div>
    );
  return (
    <form className="contact" onSubmit={submit}>
      <label>Your name<input required value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></label>
      <label>Phone (10 digits)<input required inputMode="numeric" value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></label>
      <label>Message<textarea rows="3" value={s.message} onChange={(e) => setS({ ...s, message: e.target.value })} placeholder="I'd like to visit this weekend." /></label>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="primary" disabled={state.status === "sending"}>{state.status === "sending" ? "Sending…" : "Send enquiry"}</button>
    </form>
  );
}

function Detail({ p, saved, onSave, onClose }) {
  const [contact, setContact] = useState(false);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={p.title} onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <Gallery images={p.images} />
        <div className="info">
          <div className="row">
            <div>
              <strong className="price big">{money(p.price, p.listing_type)}</strong>
              <h2>{p.title}</h2>
              <p className="muted">{p.locality}, {p.city}</p>
            </div>
            <button className={"save inline" + (saved ? " on" : "")} onClick={() => onSave(p.id)} aria-pressed={saved}>{saved ? "♥ Saved" : "♡ Save"}</button>
          </div>
          <p className="meta">{p.type} · {p.bedrooms} bed · {p.area_sqft} sq ft</p>
          <p>{p.description}</p>
          <div className="minimap"><PropertyMap items={[p]} height="180px" /></div>
          {contact ? <Contact p={p} /> : <button className="primary" onClick={() => setContact(true)}>Contact owner</button>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [f, setF] = useState({ listing: "rent", city: "", type: "", min: "", max: "", beds: "", q: "", sort: "new" });
  const [view, setView] = useState("browse");
  const [saved, toggle] = useSaved();
  const [items, setItems] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const savedKey = view === "saved" ? saved.join(",") : "";

  useEffect(() => { fetch("/api/cities").then((r) => r.json()).then(setCities).catch(() => {}); }, []);

  useEffect(() => {
    const ac = new AbortController();
    const params = new URLSearchParams();
    if (view === "saved") {
      if (!savedKey) { setItems([]); setLoading(false); return; }
      params.set("ids", savedKey);
    } else Object.entries(f).forEach(([k, v]) => v && params.set(k, v));
    setLoading(true);
    const t = setTimeout(() =>
      fetch("/api/properties?" + params, { signal: ac.signal })
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((d) => { setItems(d); setErr(""); setLoading(false); })
        .catch((e) => { if (e.name !== "AbortError") { setErr("Couldn't load listings. Check that the API and DATABASE_URL are set up."); setLoading(false); } }), 300);
    return () => { clearTimeout(t); ac.abort(); };
  }, [f, view, savedKey]);

  const reset = () => setF((s) => ({ ...s, city: "", type: "", min: "", max: "", beds: "", q: "" }));

  return (
    <>
      <header className="top">
        <h1>Nivaas</h1>
        <nav>
          <button className={view === "browse" ? "on" : ""} onClick={() => setView("browse")}>Browse</button>
          <button className={view === "saved" ? "on" : ""} onClick={() => setView("saved")}>Saved ({saved.length})</button>
        </nav>
      </header>

      {view === "browse" && (
        <section className="filters" aria-label="Filters">
          <div className="seg" role="group" aria-label="Listing type">
            {["rent", "buy"].map((l) => (
              <button key={l} className={f.listing === l ? "on" : ""} onClick={() => set("listing", l)}>{l === "rent" ? "Rent" : "Buy"}</button>
            ))}
          </div>
          <input placeholder="Search locality or title" value={f.q} onChange={(e) => set("q", e.target.value)} aria-label="Search" />
          <select value={f.city} onChange={(e) => set("city", e.target.value)} aria-label="City">
            <option value="">All cities</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={f.type} onChange={(e) => set("type", e.target.value)} aria-label="Property type">
            <option value="">Any type</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={f.beds} onChange={(e) => set("beds", e.target.value)} aria-label="Bedrooms">
            <option value="">Any beds</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ beds</option>)}
          </select>
          <input type="number" min="0" placeholder="Min ₹" value={f.min} onChange={(e) => set("min", e.target.value)} aria-label="Minimum budget" />
          <input type="number" min="0" placeholder="Max ₹" value={f.max} onChange={(e) => set("max", e.target.value)} aria-label="Maximum budget" />
          <select value={f.sort} onChange={(e) => set("sort", e.target.value)} aria-label="Sort">
            <option value="new">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <button className="link" onClick={reset}>Clear filters</button>
        </section>
      )}

      <main className="layout">
        <section aria-live="polite">
          <p className="count">{loading ? "Loading…" : `${items.length} ${items.length === 1 ? "property" : "properties"}`}</p>
          {err && <p className="error">{err}</p>}
          {!loading && !err && items.length === 0 && (
            <p className="empty">{view === "saved" ? "Nothing saved yet. Tap the heart on a listing to keep it here." : "No properties match these filters. Try a wider budget or clear the filters."}</p>
          )}
          <div className="grid">
            {items.map((p) => <Card key={p.id} p={p} saved={saved.includes(p.id)} onSave={toggle} onOpen={setOpen} />)}
          </div>
        </section>
        <aside className="map"><PropertyMap items={items} onPick={setOpen} height="100%" /></aside>
      </main>

      {open && <Detail p={open} saved={saved.includes(open.id)} onSave={toggle} onClose={() => setOpen(null)} />}
    </>
  );
}
