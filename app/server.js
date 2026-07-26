const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/merchant', (req, res) => res.sendFile(path.join(__dirname, 'public', 'merchant.html')));
app.get('/runner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'runner.html')));

// ==================== API SETTINGS & UPLOAD ====================
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/settings/batch', async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value.toString()]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/upload-logo', async (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image) return res.status(400).json({ error: 'File gambar tidak ditemukan' });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const ext = filename && filename.endsWith('.jpg') ? 'jpg' : 'png';
    const savedFilename = `custom_logo.${ext}`;
    const filePath = path.join(__dirname, 'public', 'images', savedFilename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('store_logo', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [`/images/${savedFilename}`]
    );

    res.json({ success: true, logo_url: `/images/${savedFilename}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== API DASHBOARD & PROFIT ====================
app.get('/api/admin/dashboard-stats', async (req, res) => {
  try {
    const statsRes = await pool.query(`
      SELECT 
        COUNT(o.id) AS total_orders,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) AS completed_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_price ELSE 0 END), 0) AS total_revenue_gmv,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.service_fee ELSE 0 END), 0) AS total_service_fee
      FROM orders o
    `);

    const itemFeeRes = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN oi.quantity * mn.fee_per_item ELSE 0 END), 0) AS total_item_fees,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN oi.quantity ELSE 0 END), 0) AS total_items_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menus mn ON oi.menu_id = mn.id
    `);

    const topShoopersRes = await pool.query(`
      SELECT u.name, u.phone_number, COALESCE(u.department_location, 'Lokasi Umum') AS location,
             COUNT(o.id) AS total_orders, COALESCE(SUM(o.total_price), 0) AS total_spent
      FROM users u
      JOIN orders o ON o.shooper_id = u.id AND o.status = 'completed'
      GROUP BY u.id, u.name, u.phone_number, u.department_location
      ORDER BY total_spent DESC LIMIT 10
    `);

    const topMerchantsRes = await pool.query(`
      SELECT m.id, m.name AS merchant_name, m.phone_number,
             COALESCE(SUM(oi.quantity), 0) AS total_items_sold,
             COALESCE(SUM(oi.quantity * oi.price_per_item), 0) AS total_sales,
             COALESCE(SUM(oi.quantity * COALESCE(mn.cost_price, 0)), 0) AS total_modal,
             COALESCE(SUM(oi.quantity * COALESCE(mn.runner_fee, 0)), 0) AS total_runner_fee,
             COALESCE(SUM(oi.quantity * COALESCE(mn.shooper_promo, 0)), 0) AS total_shooper_promo
      FROM merchants m
      LEFT JOIN menus mn ON mn.merchant_id = m.id
      LEFT JOIN order_items oi ON oi.menu_id = mn.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
      GROUP BY m.id, m.name, m.phone_number
      ORDER BY total_sales DESC
    `);

    const merchantsProfit = topMerchantsRes.rows.map(row => {
      const sales = parseFloat(row.total_sales);
      const modal = parseFloat(row.total_modal);
      const runnerFee = parseFloat(row.total_runner_fee);
      const shooperPromo = parseFloat(row.total_shooper_promo);
      const netProfit = sales - modal - runnerFee - shooperPromo;
      return {
        ...row,
        total_sales: sales,
        total_modal: modal,
        net_profit: netProfit > 0 ? netProfit : 0
      };
    });

    const mainStats = statsRes.rows[0];
    const itemStats = itemFeeRes.rows[0];

    res.json({
      summary: {
        total_orders: parseInt(mainStats.total_orders),
        completed_orders: parseInt(mainStats.completed_orders),
        total_items_sold: parseInt(itemStats.total_items_sold),
        gross_gmv: parseFloat(mainStats.total_revenue_gmv),
        net_profit_app: parseFloat(mainStats.total_service_fee) + parseFloat(itemStats.total_item_fees)
      },
      top_shoopers: topShoopersRes.rows,
      merchants_profit: merchantsProfit
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== API AUTH ====================
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if ((username || '').trim().toLowerCase() === 'yasir' && (password || '').trim() === 'yasir123') {
    res.json({ success: true, token: 'admin-token-yasir' });
  } else {
    res.status(401).json({ error: 'Username atau Password salah!' });
  }
});

app.post('/api/auth/login-merchant', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);

    const resMerchant = await pool.query(
      'SELECT id, name, phone_number, address, location_name, owner_name, map_link, open_time, close_time, COALESCE(is_open, TRUE) AS is_open, COALESCE(pin, \'123456\') AS pin FROM merchants WHERE phone_number = $1',
      [formattedPhone]
    );

    if (resMerchant.rows.length === 0) return res.status(404).json({ error: 'Nomor belum terdaftar.' });
    const merchant = resMerchant.rows[0];
    if (merchant.pin !== (pin || '123456')) return res.status(401).json({ error: 'PIN salah!' });

    res.json({ success: true, merchant });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/merchant/update-store', async (req, res) => {
  try {
    const { merchant_id, name, address, location_name, owner_name, map_link, open_time, close_time } = req.body;
    await pool.query(
      `UPDATE merchants SET name = $1, address = $2, location_name = $3, owner_name = $4, map_link = $5, open_time = $6, close_time = $7 WHERE id = $8`,
      [name, address, location_name, owner_name, map_link, open_time, close_time, merchant_id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/register-shooper', async (req, res) => {
  try {
    const { name, phone, location } = req.body;
    if (!phone) return res.status(400).json({ error: 'Nomor WA wajib diisi' });
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);
    const finalName = name && name.trim() !== '' ? name.trim() : `Shooper (${phone})`;

    const userRes = await pool.query(
      `INSERT INTO users (name, phone_number, role, department_location, is_approved)
       VALUES ($1, $2, 'shooper', $3, TRUE)
       ON CONFLICT (phone_number) DO UPDATE SET name = EXCLUDED.name, department_location = EXCLUDED.department_location
       RETURNING id, name, phone_number, role, department_location, reward_balance`,
      [finalName, formattedPhone, location || 'Kantor Kecamatan']
    );
    res.json({ success: true, user: userRes.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login-shooper', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Nomor WA wajib diisi' });
    let formattedPhone = phone.trim().startsWith('0') ? '62' + phone.trim().substring(1) : phone.trim();

    const userRes = await pool.query(
      'SELECT id, name, phone_number, role, department_location, COALESCE(reward_balance, 0) AS reward_balance FROM users WHERE phone_number = $1 AND role = $2',
      [formattedPhone, 'shooper']
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Nomor belum terdaftar.' });
    res.json({ success: true, user: userRes.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    let formattedPhone = (phone || '').trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);

    const userRes = await pool.query(
      'SELECT id, name, phone_number, role, is_approved, pin, COALESCE(assigned_zone, \'All\') AS assigned_zone FROM users WHERE phone_number = $1',
      [formattedPhone]
    );

    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    const user = userRes.rows[0];
    if (user.pin !== pin) return res.status(401).json({ error: 'PIN/Password salah' });

    res.json({ success: true, user: { id: user.id, name: user.name, role: user.role, assigned_zone: user.assigned_zone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== API LOCATIONS & RUNNER MODULE ====================
app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/runner/locations', async (req, res) => {
  try {
    const { name, address, area_type, contact_person } = req.body;
    await pool.query('INSERT INTO locations (name, address, area_type, contact_person) VALUES ($1, $2, $3, $4)', [name, address || '', area_type || 'Instansi', contact_person || '']);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/runner/delivery-summary', async (req, res) => {
  try {
    const query = `
      SELECT o.id AS order_id, u.name AS shooper_name, COALESCE(u.department_location, 'Umum') AS department_location,
             u.phone_number, o.total_price, o.status, o.runner_id,
             STRING_AGG(CONCAT(oi.quantity, 'x ', mn.name), ', ') AS items_summary
      FROM orders o
      JOIN users u ON o.shooper_id = u.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menus mn ON oi.menu_id = mn.id
      WHERE o.status IN ('pending_confirmation', 'confirmed', 'preparing')
      GROUP BY o.id, u.name, u.department_location, u.phone_number, o.total_price, o.status, o.runner_id
      ORDER BY o.id DESC
    `;
    const result = await pool.query(query);
    const grouped = [{
      location_name: "Zona Pengantaran",
      total_cod_group: result.rows.reduce((sum, r) => sum + parseFloat(r.total_price), 0),
      orders: result.rows
    }];
    res.json(grouped);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin & Runner Merchant Management (Auto PIN 123456)
app.get('/api/admin/merchants', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM merchants ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function saveMerchantHelper(req, res) {
  try {
    const { id, name, phone, address, location_name, owner_name, map_link, open_time, close_time } = req.body;
    let formattedPhone = (phone || '').trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);

    if (id) {
      await pool.query('UPDATE merchants SET name=$1, phone_number=$2, address=$3, location_name=$4, owner_name=$5, map_link=$6, open_time=$7, close_time=$8 WHERE id=$9', [name, formattedPhone, address, location_name, owner_name, map_link, open_time || '07:00', close_time || '17:00', id]);
    } else {
      await pool.query('INSERT INTO merchants (name, phone_number, address, location_name, owner_name, map_link, open_time, close_time, is_open, pin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, \'123456\')', [name, formattedPhone, address || '', location_name || '', owner_name || '', map_link || '', open_time || '07:00', close_time || '17:00']);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

app.post('/api/runner/merchants', saveMerchantHelper);
app.post('/api/admin/merchants', saveMerchantHelper);

// ==================== API ADMIN & MERCHANT CRUD MENUS ====================
app.get('/api/admin/menus', async (req, res) => {
  try {
    const result = await pool.query(`SELECT mn.*, m.name AS merchant_name FROM menus mn JOIN merchants m ON mn.merchant_id = m.id ORDER BY mn.id DESC`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/menus', async (req, res) => {
  try {
    const { id, merchant_id, name, cost_price, selling_price, runner_fee, shooper_promo, markup_price, image_url, is_available, publish_web, publish_pos } = req.body;
    const finalImg = image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80';
    const pubWeb = publish_web !== undefined ? publish_web : true;
    const pubPos = publish_pos !== undefined ? publish_pos : true;
    const avail = is_available !== undefined ? is_available : true;

    if (id) {
      await pool.query('UPDATE menus SET merchant_id=$1, name=$2, price=$3, cost_price=$4, runner_fee=$5, shooper_promo=$6, markup_price=$7, image_url=$8, is_available=$9, publish_web=$10, publish_pos=$11 WHERE id=$12', [merchant_id, name, selling_price, cost_price, runner_fee, shooper_promo, markup_price, finalImg, avail, pubWeb, pubPos, id]);
    } else {
      await pool.query('INSERT INTO menus (merchant_id, name, price, cost_price, runner_fee, shooper_promo, markup_price, fee_per_item, image_url, is_available, publish_web, publish_pos) VALUES ($1, $2, $3, $4, $5, $6, $7, 1000, $8, $9, $10, $11)', [merchant_id, name, selling_price || 0, cost_price || 0, runner_fee || 0, shooper_promo || 0, markup_price || 0, finalImg, avail, pubWeb, pubPos]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users-list', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/users', async (req, res) => {
  try {
    const { id, name, phone_number, department_location, role } = req.body;
    if (id) await pool.query('UPDATE users SET name=$1, phone_number=$2, department_location=$3, role=$4 WHERE id=$5', [name, phone_number, department_location, role, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== API MERCHANT DASHBOARD ====================
app.get('/api/merchant/dashboard/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const mRes = await pool.query('SELECT * FROM merchants WHERE id = $1', [merchantId]);
    if (mRes.rows.length === 0) return res.status(404).json({ error: 'Merchant tidak ditemukan' });
    const merchant = mRes.rows[0];
    const menuRes = await pool.query('SELECT * FROM menus WHERE merchant_id = $1 ORDER BY id DESC', [merchantId]);
    const orderRes = await pool.query(`
      SELECT o.id AS order_id, o.status, o.total_price, o.created_at, u.name AS shooper_name, u.phone_number, u.department_location,
             STRING_AGG(CONCAT(oi.quantity, 'x ', mn.name, ' (Rp ', oi.price_per_item, ')'), ', ') AS items_summary
      FROM orders o JOIN users u ON o.shooper_id = u.id JOIN order_items oi ON oi.order_id = o.id JOIN menus mn ON oi.menu_id = mn.id
      WHERE mn.merchant_id = $1 AND o.status IN ('confirmed', 'preparing', 'completed', 'pos_walk_in')
      GROUP BY o.id, o.status, o.total_price, o.created_at, u.name, u.phone_number, u.department_location ORDER BY o.id DESC LIMIT 20
    `, [merchantId]);
    res.json({ merchant, menus: menuRes.rows, orders: orderRes.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/merchant/pos-checkout', async (req, res) => {
  const client = await pool.connect();
  try {
    const { merchant_id, items, payment_method } = req.body;
    if (!merchant_id || !items || items.length === 0) return res.status(400).json({ error: 'Keranjang kosong' });

    await client.query('BEGIN');
    let customerRes = await client.query('SELECT id FROM users WHERE phone_number = $1', [`POS_WALK_IN_${merchant_id}`]);
    let customerId;
    if (customerRes.rows.length === 0) {
      const newCust = await client.query(
        `INSERT INTO users (name, phone_number, role, department_location, is_approved) VALUES ($1, $2, 'shooper', 'POS Offline Warung', TRUE) RETURNING id`,
        [`Tamu Kasir`, `POS_WALK_IN_${merchant_id}`]
      );
      customerId = newCust.rows[0].id;
    } else {
      customerId = customerRes.rows[0].id;
    }

    let subtotal = 0; items.forEach(i => { subtotal += parseFloat(i.price) * i.quantity; });
    const orderRes = await client.query(
      `INSERT INTO orders (shooper_id, status, total_price, delivery_fee, service_fee, payment_method, is_paid) VALUES ($1, 'completed', $2, 0, 0, $3, TRUE) RETURNING id`,
      [customerId, subtotal, payment_method || 'CASH']
    );
    const orderId = orderRes.rows[0].id;

    for (const i of items) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_id, quantity, price_per_item) VALUES ($1, $2, $3, $4)`,
        [orderId, i.menu_id, i.quantity, i.price]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, order_id: orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ==================== API CATALOG (MERCHANTS ACTIVE & PUBLISH WEB) ====================
app.get('/api/merchants/active', async (req, res) => {
  try {
    const query = `
      SELECT m.id AS merchant_id, m.name AS merchant_name, m.phone_number, m.address, m.location_name, m.map_link,
             COALESCE(m.is_open, TRUE) AS is_open, COALESCE(m.open_time::text, '07:00:00') AS open_time, COALESCE(m.close_time::text, '17:00:00') AS close_time,
             mn.id AS menu_id, mn.name AS menu_name, mn.price AS original_price, COALESCE(mn.is_available, TRUE) AS is_available, mn.image_url
      FROM merchants m LEFT JOIN menus mn ON m.id = mn.merchant_id
      WHERE m.is_active = TRUE AND mn.publish_web = TRUE AND mn.is_available = TRUE ORDER BY m.id, mn.id
    `;
    const result = await pool.query(query);
    const merchants = {};
    result.rows.forEach(row => {
      if (!merchants[row.merchant_id]) {
        merchants[row.merchant_id] = {
          id: row.merchant_id, name: row.merchant_name, address: row.address, location_name: row.location_name, map_link: row.map_link, phone: row.phone_number, is_open: row.is_open,
          open_time: row.open_time ? row.open_time.substring(0, 5) : '07:00', close_time: row.close_time ? row.close_time.substring(0, 5) : '17:00', menus: []
        };
      }
      if (row.menu_id) {
        merchants[row.merchant_id].menus.push({ id: row.menu_id, name: row.menu_name, price: parseFloat(row.original_price), image_url: row.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80' });
      }
    });
    res.json(Object.values(merchants));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== API ORDERS ====================
app.post('/api/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, phone, location, notes, items } = req.body;
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);

    await client.query('BEGIN');
    let userRes = await client.query('SELECT id FROM users WHERE phone_number = $1', [formattedPhone]);
    let userId;
    if (userRes.rows.length === 0) {
      const newUser = await client.query('INSERT INTO users (name, phone_number, role, department_location, is_approved) VALUES ($1, $2, \'shooper\', $3, TRUE) RETURNING id', [name, formattedPhone, location || 'Kantor Kecamatan']);
      userId = newUser.rows[0].id;
    } else { userId = userRes.rows[0].id; }

    let subtotal = 0; items.forEach(i => { subtotal += parseFloat(i.price) * i.quantity; });
    const grandTotal = subtotal + 5000;
    const orderRes = await client.query('INSERT INTO orders (shooper_id, status, total_price, delivery_fee, service_fee, payment_method) VALUES ($1, \'pending_confirmation\', $2, 3000, 2000, \'COD\') RETURNING id', [userId, grandTotal]);
    const orderId = orderRes.rows[0].id;

    for (const i of items) {
      await client.query('INSERT INTO order_items (order_id, menu_id, quantity, notes, price_per_item) VALUES ($1, $2, $3, $4, $5)', [orderId, i.menu_id, i.quantity, notes || '', i.price]);
    }
    await client.query('COMMIT');
    res.json({ success: true, order_id: orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

app.listen(port, () => { console.log(`Titip Shoopy running on port ${port}`); });
