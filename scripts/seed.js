import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// title, city, locality, listing, type, price, bedrooms, area_sqft, lat, lng
const rows = [
  ["2 BHK near the IT park, semi-furnished", "Pune", "Hinjewadi", "rent", "Apartment", 22000, 2, 980, 18.5912, 73.7389],
  ["1 BHK for working professionals", "Pune", "Baner", "rent", "Apartment", 18500, 1, 620, 18.559, 73.7868],
  ["Shared PG room, meals included", "Pune", "Kothrud", "rent", "PG / Hostel", 7500, 1, 180, 18.5074, 73.8077],
  ["3 BHK family flat with parking", "Nagpur", "Dharampeth", "rent", "Apartment", 26000, 3, 1450, 21.1393, 79.0657],
  ["Student room close to college", "Nagpur", "Manish Nagar", "rent", "PG / Hostel", 5500, 1, 150, 21.0985, 79.062],
  ["2 BHK in a quiet society", "Pune", "Talegaon Dabhade", "rent", "Apartment", 12000, 2, 850, 18.7351, 73.676],
  ["2 BHK with lake view", "Mumbai", "Powai", "rent", "Apartment", 58000, 2, 900, 19.1176, 72.906],
  ["3 BHK ready-to-move apartment", "Pune", "Wakad", "buy", "Apartment", 9200000, 3, 1280, 18.5987, 73.7609],
  ["4 BHK independent house with garden", "Nagpur", "Besa", "buy", "Independent House", 13800000, 4, 2100, 21.0615, 79.1148],
  ["Villa in a gated community", "Pune", "Talegaon Dabhade", "buy", "Villa", 14500000, 4, 2400, 18.729, 73.684],
  ["1 BHK investment flat", "Mumbai", "Andheri", "buy", "Apartment", 11500000, 1, 480, 19.1136, 72.8697],
  ["2 BHK near the metro", "Pune", "Kothrud", "buy", "Apartment", 8400000, 2, 940, 18.512, 73.815],
];
const owners = ["Rohan Deshmukh", "Sneha Kulkarni", "Amit Patil", "Meera Joshi"];

await pool.query(`
  CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, city TEXT NOT NULL, locality TEXT NOT NULL,
    listing_type TEXT NOT NULL CHECK (listing_type IN ('rent','buy')), type TEXT NOT NULL,
    price BIGINT NOT NULL, bedrooms INT NOT NULL, area_sqft INT NOT NULL, description TEXT,
    images TEXT[] NOT NULL, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
    owner_name TEXT, owner_phone TEXT, created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_prop_filter ON properties (listing_type, city, type, price);
  CREATE TABLE IF NOT EXISTS inquiries (
    id SERIAL PRIMARY KEY, property_id INT REFERENCES properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL, phone TEXT NOT NULL, message TEXT, created_at TIMESTAMPTZ DEFAULT now()
  );
  TRUNCATE properties RESTART IDENTITY CASCADE;
`);

for (const [i, r] of rows.entries()) {
  const [title, city, locality, listing, type, price, beds, area, lat, lng] = r;
  const images = [0, 1, 2, 3].map((n) => `https://picsum.photos/seed/nivaas-${i + 1}-${n}/900/600`);
  const desc = `${type} in ${locality}, ${city}. ${area} sq ft with ${beds} bedroom${beds > 1 ? "s" : ""}. Close to markets, schools and public transport. Visits can be arranged on weekends.`;
  await pool.query(
    `INSERT INTO properties (title,city,locality,listing_type,type,price,bedrooms,area_sqft,description,images,lat,lng,owner_name,owner_phone)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [title, city, locality, listing, type, price, beds, area, desc, images, lat, lng, owners[i % 4], `98765432${String(10 + i)}`]
  );
}
console.log(`Seeded ${rows.length} properties`);
await pool.end();
