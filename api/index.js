import express from "express";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const app = express();
app.use(express.json());

// GET /api/properties?listing=rent&city=Pune&type=Apartment&min=&max=&beds=&q=&sort=&ids=1,2
app.get("/api/properties", async (req, res) => {
  try {
    const q = req.query, where = [], vals = [];
    const add = (sql, val) => {
      vals.push(val);
      where.push(sql.replaceAll("@", () => `$${vals.length}`));
    };
    if (q.ids) add("id = ANY(@::int[])", q.ids.split(",").map(Number).filter(Number.isInteger));
    if (q.listing) add("listing_type = @", q.listing);
    if (q.city) add("city = @", q.city);
    if (q.type) add("type = @", q.type);
    if (q.min) add("price >= @", Number(q.min));
    if (q.max) add("price <= @", Number(q.max));
    if (q.beds) add("bedrooms >= @", Number(q.beds));
    if (q.q) add("(title ILIKE @ OR locality ILIKE @)", `%${q.q}%`);
    const order = { price_asc: "price ASC", price_desc: "price DESC" }[q.sort] || "created_at DESC";
    const sql = `SELECT * FROM properties ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order} LIMIT 60`;
    const { rows } = await pool.query(sql, vals);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load properties" });
  }
});

app.get("/api/cities", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT DISTINCT city FROM properties ORDER BY city");
    res.json(rows.map((r) => r.city));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load cities" });
  }
});

app.post("/api/inquiries", async (req, res) => {
  const { propertyId, name, phone, message } = req.body || {};
  if (!propertyId || !name?.trim() || !/^\d{10}$/.test(phone || "")) {
    return res.status(400).json({ error: "Enter your name and a 10-digit phone number." });
  }
  try {
    await pool.query(
      "INSERT INTO inquiries (property_id, name, phone, message) VALUES ($1,$2,$3,$4)",
      [propertyId, name.trim(), phone, (message || "").slice(0, 500)]
    );
    const { rows } = await pool.query("SELECT owner_name, owner_phone FROM properties WHERE id = $1", [propertyId]);
    res.status(201).json(rows[0] || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not send your enquiry. Try again." });
  }
});

export default app;
