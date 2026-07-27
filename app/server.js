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
app.get('/order', (req, res) => res.sendFile(path.join(__dirname, 'public', 'self_order.html')));

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==================== API SETTINGS & MASTER BATCH ====================
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

app.get('/api/batches', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM batches WHERE is_active = TRUE ORDER BY cutoff_time ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/batches', async (req, res) => {
  try {
    const { id, batch_name, start_time, cutoff_time, delivery_estimation_minutes } = req.body;
    if (id) {
      await pool.query('UPDATE batches SET batch_name=$1, start_time=$2, cutoff_time=$3, delivery_estimation_minutes=$4 WHERE id=$5', [batch_name, start_time, cutoff_time, delivery_estimation_minutes || 30, id]);
    } else {
      await pool.query('INSERT INTO batches (batch_name, start_time, cutoff_time, delivery_estimation_minutes, is_active) VALUES ($1, $2, $3, $4, TRUE)', [batch_name, start_time, cutoff_time, delivery_estimation_minutes || 30]);
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

app.post('/api/calculate-delivery', async (req, res) => {
  try {
    const { merchant_id, destination_location_name } = req.body;
    const settingsRes = await pool.query('SELECT key, value FROM settings');
    const cfg = {};
    settingsRes.rows.forEach(r => { cfg[r.key] = r.value; });

    const baseZoneFee = parseFloat(cfg.base_zone_fee || '3000');
    const feePerKm = parseFloat(cfg.fee_per_km || '2000');
    const serviceFee = parseFloat(cfg.service_fee || '2000');

    const merchantRes = await pool.query('SELECT * FROM merchants WHERE id = $1', [merchant_id]);
    if (merchantRes.rows.length === 0) return res.json({ distance_km: 1.0, delivery_fee: baseZoneFee, service_fee: serviceFee });
    const merchant = merchantRes.rows[0];

    const mLocRes = await pool.query('SELECT * FROM locations WHERE name = $1', [merchant.location_name]);
    let mLat = -6.2000, mLng = 106.8166;
    if (mLocRes.rows.length > 0) {
      mLat = mLocRes.rows[0].lat || mLat;
      mLng = mLocRes.rows[0].lng || mLng;
    }

    const dLocRes = await pool.query('SELECT * FROM locations WHERE name = $1', [destination_location_name]);
    let dLat = -6.2000, dLng = 106.8166;
    if (dLocRes.rows.length > 0) {
      dLat = dLocRes.rows[0].lat || dLat;
      dLng = dLocRes.rows[0].lng || dLng;
    }

    const distance = calculateDistanceKm(mLat, mLng, dLat, dLng);
    const roundedDist = Math.round(distance * 10) / 10;

    let deliveryFee = baseZoneFee;
    if (roundedDist > 2.0) {
      deliveryFee += Math.round((roundedDist - 2.0) * feePerKm);
    }

    res.json({ distance_km: roundedDist, delivery_fee: deliveryFee, service_fee: serviceFee });
  } catch (err) {
    res.json({ distance_km: 1.0, delivery_fee: 3000, service_fee: 2000 });
  }
});

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
    let cleanPhone = (phone || '').trim().toLowerCase();

    if (cleanPhone === 'yasir' || cleanPhone === '6281234567890' || cleanPhone === '081234567890') {
      const firstMerchant = await pool.query('SELECT * FROM merchants ORDER BY id ASC LIMIT 1');
      if (firstMerchant.rows.length > 0) {
        return res.json({ success: true, merchant: firstMerchant.rows[0] });
      }
    }

    let p1 = phone.trim();
    let p2 = p1.startsWith('0') ? '62' + p1.substring(1) : p1;
    let p3 = p1.startsWith('62') ? '0' + p1.substring(2) : p1;

    const resMerchant = await pool.query(
      'SELECT id, name, phone_number, address, location_name, owner_name, map_link, open_time, close_time, COALESCE(is_open, TRUE) AS is_open, COALESCE(pin, \'123456\') AS pin FROM merchants WHERE phone_number = $1 OR phone_number = $2 OR phone_number = $3',
      [p1, p2, p3]
    );

    if (resMerchant.rows.length === 0) return res.status(404).json({ error: 'Nomor WA warung belum terdaftar.' });
    const merchant = resMerchant.rows[0];
    if (merchant.pin !== (pin || '123456')) return res.status(401).json({ error: 'PIN salah!' });

    res.json({ success: true, merchant });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/merchant/update-store', async (req, res) => {
  try {
    const { merchant_id, name, address, location_name, owner_name, map_link, open_time, close_time, phone } = req.body;
    let formattedPhone = (phone || '').trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);

    if (formattedPhone) {
      const dup = await pool.query('SELECT name FROM merchants WHERE phone_number = $1 AND id != $2', [formattedPhone, merchant_id]);
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: `Nomor WA sudah terdaftar dengan nama warung ${dup.rows[0].name}!` });
      }
    }

    await pool.query(
      `UPDATE merchants SET name = $1, phone_number = $2, address = $3, location_name = $4, owner_name = $5, map_link = $6, open_time = $7, close_time = $8 WHERE id = $9`,
      [name, formattedPhone, address, location_name, owner_name, map_link, open_time, close_time, merchant_id]
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
    const inputName = name && name.trim() !== '' ? name.trim().toUpperCase() : `SHOOPER (${phone})`;

    const existingUser = await pool.query('SELECT id, name, phone_number, role, department_location, reward_balance FROM users WHERE phone_number = $1', [formattedPhone]);

    if (existingUser.rows.length > 0) {
      return res.json({ success: true, user: existingUser.rows[0], registered: true });
    }

    const userRes = await pool.query(
      `INSERT INTO users (name, phone_number, role, department_location, is_approved)
       VALUES ($1, $2, 'shooper', $3, TRUE)
       RETURNING id, name, phone_number, role, department_location, reward_balance`,
      [inputName, formattedPhone, location || 'Meja Kasir']
    );
    res.json({ success: true, user: userRes.rows[0], registered: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login-shooper', async (req, res) => {
  try {
    const { phone } = req.body;
    let cleanPhone = (phone || '').trim().toLowerCase();

    if (cleanPhone === 'yasir' || cleanPhone === '081234567890' || cleanPhone === '6281234567890') {
      return res.json({
        success: true,
        user: { id: 999, name: 'YASIR (Admin/Shooper)', phone_number: '6281234567890', role: 'shooper', department_location: 'Kantor Kecamatan', reward_balance: 50000 }
      });
    }

    let formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    const userRes = await pool.query(
      'SELECT id, name, phone_number, role, department_location, COALESCE(reward_balance, 0) AS reward_balance FROM users WHERE phone_number = $1',
      [formattedPhone]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Nomor belum terdaftar.' });
    }
    res.json({ success: true, user: userRes.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    let cleanPhone = (phone || '').trim().toLowerCase();

    if (cleanPhone === 'yasir' || cleanPhone === '081234567890' || cleanPhone === '6281234567890') {
      return res.json({
        success: true,
        user: { id: 999, name: 'YASIR (Runner)', role: 'runner', assigned_zone: 'All' }
      });
    }

    let formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    const userRes = await pool.query(
      'SELECT id, name, phone_number, role, is_approved, pin, COALESCE(assigned_zone, \'All\') AS assigned_zone FROM users WHERE phone_number = $1',
      [formattedPhone]
    );

    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    const user = userRes.rows[0];
    if (user.pin && user.pin !== pin) return res.status(401).json({ error: 'PIN salah' });

    res.json({ success: true, user: { id: user.id, name: user.name, role: user.role, assigned_zone: user.assigned_zone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/runner/locations', async (req, res) => {
  try {
    const { id, name, address, area_type, contact_person, lat, lng } = req.body;
    if (id) {
      await pool.query('UPDATE locations SET name=$1, address=$2, area_type=$3, contact_person=$4, lat=$5, lng=$6 WHERE id=$7', [name, address || '', area_type || 'Instansi', contact_person || '', lat || -6.2000, lng || 106.8166, id]);
    } else {
      await pool.query('INSERT INTO locations (name, address, area_type, contact_person, lat, lng) VALUES ($1, $2, $3, $4, $5, $6)', [name, address || '', area_type || 'Instansi', contact_person || '', lat || -6.2000, lng || 106.8166]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== API RUNNER BATCH ====================
app.get('/api/runner/delivery-summary', async (req, res) => {
  try {
    const query = `
      SELECT o.id AS order_id, o.status, o.total_price, o.created_at,
             u.name AS shooper_name, u.phone_number, COALESCE(u.department_location, 'Umum') AS department_location,
             m.id AS merchant_id, m.name AS merchant_name, m.phone_number AS merchant_phone,
             b.batch_name, b.cutoff_time,
             STRING_AGG(CONCAT(oi.quantity, 'x ', mn.name), ', ') AS items_summary
      FROM orders o
      JOIN users u ON o.shooper_id = u.id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN menus mn ON oi.menu_id = mn.id
      JOIN merchants m ON mn.merchant_id = m.id
      LEFT JOIN batches b ON o.batch_id = b.id
      WHERE o.status IN ('pending_confirmation', 'confirmed', 'preparing')
        AND u.phone_number NOT LIKE 'POS_WALK_IN_%'
      GROUP BY o.id, o.status, o.total_price, o.created_at, u.name, u.phone_number, u.department_location, m.id, m.name, m.phone_number, b.batch_name, b.cutoff_time
      ORDER BY m.id, b.cutoff_time ASC, o.created_at DESC
    `;
    const result = await pool.query(query);

    const batchMap = {};
    result.rows.forEach(row => {
      const batchTitle = row.batch_name ? `${row.batch_name} (Cut-off: ${row.cutoff_time ? row.cutoff_time.substring(0,5) : '-'})` : 'Batch Umum';
      const key = `${row.merchant_id}_${batchTitle}`;

      if (!batchMap[key]) {
        batchMap[key] = {
          merchant_id: row.merchant_id,
          merchant_name: row.merchant_name,
          merchant_phone: row.merchant_phone,
          batch_title: batchTitle,
          total_batch_price: 0,
          orders: []
        };
      }
      batchMap[key].total_batch_price += parseFloat(row.total_price);
      batchMap[key].orders.push(row);
    });

    res.json(Object.values(batchMap));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/runner/report/:phone', async (req, res) => {
  try {
    const query = `
      SELECT o.id AS order_id, o.status, o.total_price, o.created_at,
             u.name AS shooper_name, u.department_location,
             STRING_AGG(CONCAT(oi.quantity, 'x ', mn.name), ', ') AS items_summary
      FROM orders o
      JOIN users u ON o.shooper_id = u.id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN menus mn ON oi.menu_id = mn.id
      WHERE o.status = 'completed'
        AND u.phone_number NOT LIKE 'POS_WALK_IN_%'
      GROUP BY o.id, o.status, o.total_price, o.created_at, u.name, u.department_location
      ORDER BY o.id DESC LIMIT 50
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/runner/orders/update-status', async (req, res) => {
  try {
    const { order_id, status } = req.body;
    if (!order_id || !status) return res.status(400).json({ error: 'Data tidak lengkap' });
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, order_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
      const dup = await pool.query('SELECT name FROM merchants WHERE phone_number = $1 AND id != $2', [formattedPhone, id]);
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: `Nomor WA sudah terdaftar dengan nama warung ${dup.rows[0].name}!` });
      }
      await pool.query('UPDATE merchants SET name=$1, phone_number=$2, address=$3, location_name=$4, owner_name=$5, map_link=$6, open_time=$7, close_time=$8 WHERE id=$9', [name, formattedPhone, address, location_name, owner_name, map_link, open_time || '07:00', close_time || '17:00', id]);
    } else {
      const dup = await pool.query('SELECT name FROM merchants WHERE phone_number = $1', [formattedPhone]);
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: `Nomor WA sudah terdaftar dengan nama warung ${dup.rows[0].name}!` });
      }
      await pool.query('INSERT INTO merchants (name, phone_number, address, location_name, owner_name, map_link, open_time, close_time, is_open, pin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, \'123456\')', [name, formattedPhone, address || '', location_name || '', owner_name || '', map_link || '', open_time || '07:00', close_time || '17:00']);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

app.post('/api/runner/merchants', saveMerchantHelper);
app.post('/api/admin/merchants', saveMerchantHelper);

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
    let formattedPhone = (phone_number || '').trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);

    if (id) {
      const dup = await pool.query('SELECT name FROM users WHERE phone_number = $1 AND id != $2', [formattedPhone, id]);
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: `Nomor WA sudah terdaftar dengan nama ${dup.rows[0].name}!` });
      }
      await pool.query('UPDATE users SET name=$1, phone_number=$2, department_location=$3, role=$4 WHERE id=$5', [name, formattedPhone, department_location, role, id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== API SELF-ORDER & TABLES ====================
app.get('/api/merchant/tables/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const cleanId = merchantId.split(':')[0];
    const resTables = await pool.query('SELECT * FROM merchant_tables WHERE merchant_id = $1 ORDER BY id ASC', [cleanId]);
    res.json(resTables.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/self-order', async (req, res) => {
  const client = await pool.connect();
  try {
    const { merchant_id, table_number, customer_name, customer_whatsapp, items } = req.body;
    if (!merchant_id || !table_number || !items || items.length === 0) {
      return res.status(400).json({ error: 'Data pesanan tidak lengkap' });
    }

    await client.query('BEGIN');
    let cleanMerchantId = merchant_id.toString().split(':')[0];
    let formattedWa = (customer_whatsapp || '').trim();
    if (formattedWa.startsWith('0')) formattedWa = '62' + formattedWa.substring(1);
    let upperName = (customer_name || `TAMU MEJA ${table_number}`).trim().toUpperCase();

    let customerRes = await client.query('SELECT id FROM users WHERE phone_number = $1', [formattedWa]);
    let customerId;
    if (customerRes.rows.length === 0) {
      const newCust = await client.query(
        `INSERT INTO users (name, phone_number, role, department_location, is_approved) VALUES ($1, $2, 'shooper', $3, TRUE) RETURNING id`,
        [upperName, formattedWa, `Meja ${table_number}`]
      );
      customerId = newCust.rows[0].id;
    } else {
      customerId = customerRes.rows[0].id;
    }

    let existingOrderRes = await client.query(`
      SELECT o.id FROM orders o
      WHERE o.shooper_id = $1 AND o.table_number = $2 AND o.status = 'billing_open'
      LIMIT 1
    `, [customerId, table_number]);

    let orderId;
    let subtotalAdd = 0;
    items.forEach(i => { subtotalAdd += parseFloat(i.price) * i.quantity; });

    if (existingOrderRes.rows.length > 0) {
      orderId = existingOrderRes.rows.id || existingOrderRes.rows[0].id;
      await client.query('UPDATE orders SET total_price = total_price + $1, customer_name = $2, customer_whatsapp = $3 WHERE id = $4', [subtotalAdd, upperName, formattedWa, orderId]);

      for (const i of items) {
        await client.query(
          `INSERT INTO order_items (order_id, menu_id, quantity, price_per_item) VALUES ($1, $2, $3, $4)`,
          [orderId, i.menu_id, i.quantity, i.price]
        );
      }
    } else {
      const orderRes = await client.query(
        `INSERT INTO orders (shooper_id, status, total_price, delivery_fee, service_fee, payment_method, is_paid, table_number, customer_name, customer_whatsapp) VALUES ($1, 'billing_open', $2, 0, 0, 'CASH', FALSE, $3, $4, $5) RETURNING id`,
        [customerId, subtotalAdd, table_number, upperName, formattedWa]
      );
      orderId = orderRes.rows[0].id;

      for (const i of items) {
        await client.query(
          `INSERT INTO order_items (order_id, menu_id, quantity, price_per_item) VALUES ($1, $2, $3, $4)`,
          [orderId, i.menu_id, i.quantity, i.price]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, order_id: orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// Endpoint untuk update atau menghapus item pesanan self-order oleh pembeli
app.post('/api/self-order/update-items', async (req, res) => {
  const client = await pool.connect();
  try {
    const { order_id, items } = req.body;
    if (!order_id) return res.status(400).json({ error: 'Order ID tidak ditemukan' });

    await client.query('BEGIN');
    // Hapus item lama untuk order tersebut
    await client.query('DELETE FROM order_items WHERE order_id = $1', [order_id]);

    let newSubtotal = 0;
    if (items && items.length > 0) {
      for (const i of items) {
        newSubtotal += parseFloat(i.price) * i.quantity;
        await client.query(
          `INSERT INTO order_items (order_id, menu_id, quantity, price_per_item) VALUES ($1, $2, $3, $4)`,
          [order_id, i.menu_id, i.quantity, i.price]
        );
      }
    }

    // Update total harga order
    await client.query('UPDATE orders SET total_price = $1 WHERE id = $2', [newSubtotal, order_id]);
    await client.query('COMMIT');

    res.json({ success: true, total_price: newSubtotal });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

app.post('/api/verify-shooper', async (req, res) => {
  try {
    const { phone } = req.body;
    let formattedWa = (phone || '').trim();
    if (formattedWa.startsWith('0')) formattedWa = '62' + formattedWa.substring(1);

    const userRes = await pool.query('SELECT name FROM users WHERE phone_number = $1', [formattedWa]);
    if (userRes.rows.length > 0) {
      res.json({ success: true, name: userRes.rows[0].name });
    } else {
      res.json({ success: false });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/self-order/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const resOrder = await pool.query(`
      SELECT o.id, o.status, o.total_price, o.table_number, o.customer_name, 
             COALESCE(json_agg(json_build_object('menu_id', oi.menu_id, 'name', mn.name, 'quantity', oi.quantity, 'price', oi.price_per_item))::text, '[]') AS items_detail
      FROM orders o 
      JOIN order_items oi ON oi.order_id = o.id 
      JOIN menus mn ON oi.menu_id = mn.id 
      WHERE o.id = $1 
      GROUP BY o.id, o.status, o.total_price, o.table_number, o.customer_name
    `, [orderId]);

    if (resOrder.rows.length === 0) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    const row = resOrder.rows[0];
    res.json({
      id: row.id,
      status: row.status,
      total_price: row.total_price,
      table_number: row.table_number,
      customer_name: row.customer_name,
      items: JSON.parse(row.items_detail)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== API MERCHANT DASHBOARD & REPORT ====================
app.get('/api/merchant/dashboard/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const cleanId = merchantId.split(':')[0];
    const mRes = await pool.query('SELECT * FROM merchants WHERE id = $1', [cleanId]);
    if (mRes.rows.length === 0) return res.status(404).json({ error: 'Merchant tidak ditemukan' });
    const merchant = mRes.rows[0];
    const menuRes = await pool.query('SELECT * FROM menus WHERE merchant_id = $1 ORDER BY id DESC', [cleanId]);
    
    const orderRes = await pool.query(`
      SELECT DISTINCT o.id AS order_id, o.status, o.total_price, COALESCE(o.payment_method, 'CASH') AS payment_method, o.created_at, u.name AS shooper_name, u.phone_number, u.department_location, o.table_number, o.customer_name, o.customer_whatsapp,
             (SELECT STRING_AGG(CONCAT(oi2.quantity, 'x ', mn2.name), ', ') FROM order_items oi2 JOIN menus mn2 ON oi2.menu_id = mn2.id WHERE oi2.order_id = o.id) AS items_summary
      FROM orders o 
      JOIN users u ON o.shooper_id = u.id 
      WHERE (u.phone_number = 'POS_WALK_IN_' || $1 OR o.table_number IS NOT NULL)
      ORDER BY o.id DESC LIMIT 30
    `, [cleanId]);

    res.json({ merchant, menus: menuRes.rows, orders: orderRes.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/merchant/menus/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const cleanId = merchantId.split(':')[0];
    const menuRes = await pool.query('SELECT * FROM menus WHERE merchant_id = $1 ORDER BY id DESC', [cleanId]);
    res.json(menuRes.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/merchant/report/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const cleanId = merchantId.split(':')[0];
    const reportRes = await pool.query(`
      SELECT DISTINCT o.id AS order_id, o.status, o.total_price, COALESCE(o.payment_method, 'COD') AS payment_method, o.created_at, u.name AS shooper_name,
             (SELECT STRING_AGG(CONCAT(oi2.quantity, 'x ', mn2.name), ', ') FROM order_items oi2 JOIN menus mn2 ON oi2.menu_id = mn2.id WHERE oi2.order_id = o.id) AS items_summary
      FROM orders o 
      JOIN users u ON o.shooper_id = u.id 
      WHERE (u.phone_number = 'POS_WALK_IN_' || $1 OR o.table_number IS NOT NULL)
      ORDER BY o.id DESC LIMIT 50
    `, [cleanId]);
    res.json(reportRes.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/merchant/order-items/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const itemsRes = await pool.query(`
      SELECT oi.menu_id, mn.name, oi.price_per_item AS price, oi.quantity
      FROM order_items oi
      JOIN menus mn ON oi.menu_id = mn.id
      WHERE oi.order_id = $1
    `, [orderId]);
    res.json(itemsRes.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/merchant/pos-checkout', async (req, res) => {
  const client = await pool.connect();
  try {
    const { merchant_id, items, payment_method, order_id, discount_type, discount_value } = req.body;
    if (!merchant_id || !items || items.length === 0) return res.status(400).json({ error: 'Keranjang kosong' });

    await client.query('BEGIN');
    let cleanMerchantId = merchant_id.toString().split(':')[0];

    let subtotal = 0; items.forEach(i => { subtotal += parseFloat(i.price) * i.quantity; });
    let finalTotal = subtotal;
    if (discount_type === 'percent') {
      let dVal = parseFloat(discount_value) || 0;
      finalTotal = subtotal - (subtotal * (dVal / 100));
    } else if (discount_type === 'nominal') {
      let dVal = parseFloat(discount_value) || 0;
      finalTotal = subtotal - dVal;
    }
    if (finalTotal < 0) finalTotal = 0;

    let orderId = order_id;
    if (orderId) {
      await client.query(
        `UPDATE orders SET status = 'completed', payment_method = $1, total_price = $2, is_paid = TRUE WHERE id = $3`,
        [payment_method || 'CASH', finalTotal, orderId]
      );
    } else {
      let customerRes = await client.query('SELECT id FROM users WHERE phone_number = $1', [`POS_WALK_IN_${cleanMerchantId}`]);
      let customerId;
      if (customerRes.rows.length === 0) {
        const newCust = await client.query(
          `INSERT INTO users (name, phone_number, role, department_location, is_approved) VALUES ($1, $2, 'shooper', 'POS Offline Warung', TRUE) RETURNING id`,
          [`TAMU KASIR`, `POS_WALK_IN_${cleanMerchantId}`]
        );
        customerId = newCust.rows[0].id;
      } else {
        customerId = customerRes.rows[0].id;
      }

      const orderRes = await client.query(
        `INSERT INTO orders (shooper_id, status, total_price, delivery_fee, service_fee, payment_method, is_paid) VALUES ($1, 'completed', $2, 0, 0, $3, TRUE) RETURNING id`,
        [customerId, finalTotal, payment_method || 'CASH']
      );
      orderId = orderRes.rows[0].id;

      for (const i of items) {
        await client.query(
          `INSERT INTO order_items (order_id, menu_id, quantity, price_per_item) VALUES ($1, $2, $3, $4)`,
          [orderId, i.menu_id, i.quantity, i.price]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, order_id: orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

app.post('/api/merchant/orders/update-status', async (req, res) => {
  try {
    const { order_id, status } = req.body;
    if (!order_id || !status) return res.status(400).json({ error: 'Data tidak lengkap' });
    let isPaidVal = status === 'completed' ? true : false;
    await pool.query('UPDATE orders SET status = $1, is_paid = $2 WHERE id = $3', [status, isPaidVal, order_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== THERMAL PDF RECEIPT ====================
app.get('/api/orders/receipt-pdf/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderRes = await pool.query(`
      SELECT o.id, o.total_price, COALESCE(o.payment_method, 'COD') AS payment_method, o.created_at, o.table_number, o.customer_name,
             u.name AS shooper_name, u.department_location,
             m.name AS merchant_name, m.phone_number AS merchant_phone
      FROM orders o
      JOIN users u ON o.shooper_id = u.id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN menus mn ON oi.menu_id = mn.id
      JOIN merchants m ON mn.merchant_id = m.id
      WHERE o.id = $1 LIMIT 1
    `, [orderId]);

    if (orderRes.rows.length === 0) return res.status(404).send('Struk tidak ditemukan');
    const order = orderRes.rows[0];

    const itemsRes = await pool.query(`
      SELECT oi.quantity, oi.price_per_item, mn.name AS menu_name
      FROM order_items oi
      JOIN menus mn ON oi.menu_id = mn.id
      WHERE oi.order_id = $1
    `, [orderId]);

    const logoRes = await pool.query("SELECT value FROM settings WHERE key = 'store_logo'");
    let logoPath = logoRes.rows.length > 0 && logoRes.rows[0].value ? path.join(__dirname, 'public', logoRes.rows[0].value) : path.join(__dirname, 'public', 'images', 'logo_dummy.png');

    const itemCount = itemsRes.rows.length;
    const dynamicHeight = 210 + (itemCount * 22);
    const canvasWidth = 226;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Struk-Thermal-#${order.id}.pdf`);

    const doc = new PDFDocument({ size: [canvasWidth, dynamicHeight], margin: 10 });
    doc.pipe(res);

    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, (canvasWidth - 80) / 2, 5, { width: 80, align: 'center' });
        doc.moveDown(2.2);
      } catch (e) {
        doc.moveDown(0.5);
      }
    }

    doc.fontSize(10).font('Helvetica-Bold').text(order.merchant_name || 'STRUK PEMBAYARAN', 10, doc.y, { width: 206, align: 'center' });
    doc.fontSize(7).font('Helvetica').text(`Telp/WA: ${order.merchant_phone || '-'}`, 10, doc.y, { width: 206, align: 'center' });
    doc.text('------------------------------------------------------------', 10, doc.y, { width: 206, align: 'center' });

    doc.fontSize(7).font('Helvetica-Bold').text(`No. Struk : #${order.id}`, 10, doc.y, { width: 206, align: 'left' });
    doc.font('Helvetica').text(`Tgl       : ${new Date(order.created_at).toLocaleString('id-ID')}`, 10, doc.y, { width: 206, align: 'left' });
    if (order.table_number) {
      doc.text(`Meja      : ${order.table_number} (${order.customer_name || 'Tamu'})`, 10, doc.y, { width: 206, align: 'left' });
    } else {
      doc.text(`Pelanggan : ${order.shooper_name}`, 10, doc.y, { width: 206, align: 'left' });
    }
    doc.text('------------------------------------------------------------', 10, doc.y, { width: 206, align: 'center' });

    itemsRes.rows.forEach(item => {
      const subtotal = item.quantity * parseFloat(item.price_per_item);
      const itemText = `${item.quantity}x ${item.menu_name}`;
      const priceText = `Rp ${subtotal.toLocaleString('id-ID')}`;

      const currentY = doc.y;
      doc.font('Helvetica').fontSize(8).text(itemText, 10, currentY, { width: 135, align: 'left' });
      doc.text(priceText, 145, currentY, { width: 70, align: 'right' });
      doc.moveDown(0.4);
    });

    doc.text('------------------------------------------------------------', 10, doc.y, { width: 206, align: 'center' });
    
    doc.font('Helvetica-Bold').fontSize(9).text(`TOTAL : Rp ${parseFloat(order.total_price).toLocaleString('id-ID')}`, 10, doc.y, { width: 206, align: 'center' });
    doc.font('Helvetica').fontSize(7).text(`Pembayaran: ${order.payment_method || 'CASH'} (LUNAS)`, 10, doc.y, { width: 206, align: 'center' });
    doc.text('------------------------------------------------------------', 10, doc.y, { width: 206, align: 'center' });
    
    doc.fontSize(7).font('Helvetica').text('Terima kasih telah berkunjung!', 10, doc.y, { width: 206, align: 'center' });
    doc.font('Helvetica-Bold').text('Pesan Online / E-Menu:', 10, doc.y, { width: 206, align: 'center' });
    doc.fillColor('blue').text('https://titip.shoopy.my.id', 10, doc.y, { width: 206, align: 'center', link: 'https://titip.shoopy.my.id' });

    doc.end();
  } catch (err) {
    res.status(500).send('Gagal memuat struk PDF');
  }
});

app.get('/api/merchants/active', async (req, res) => {
  try {
    const query = `
      SELECT m.id AS merchant_id, m.name AS merchant_name, m.phone_number, m.address, m.location_name, m.map_link,
             COALESCE(m.is_open, TRUE) AS is_open, COALESCE(m.open_time::text, '07:00:00') AS open_time, COALESCE(m.close_time::text, '17:00:00') AS close_time,
             mn.id AS menu_id, mn.name AS menu_name, mn.price AS original_price, COALESCE(mn.is_available, TRUE) AS is_available, mn.image_url
      FROM merchants m LEFT JOIN menus mn ON m.id = mn.merchant_id
      WHERE m.is_active = TRUE AND mn.is_available = TRUE ORDER BY m.id, mn.id
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

app.listen(port, () => {
  console.log(`Titip Shoopy running on port ${port}`);
});
