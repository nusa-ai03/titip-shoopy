const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const PDFDocument = require('pdfkit');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/merchant', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'merchant.html'));
});

// ==================== API ALL MASTER SETTINGS ====================
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings/batch', async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value.toString()]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== API EXECUTIVE DASHBOARD STATS ====================
app.get('/api/admin/dashboard-stats', async (req, res) => {
  try {
    const statsRes = await pool.query(`
      SELECT 
        COUNT(o.id) AS total_orders,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) AS completed_orders,
        COUNT(CASE WHEN o.status IN ('pending_confirmation', 'confirmed', 'preparing') THEN 1 END) AS pending_orders,
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
             COUNT(o.id) AS total_orders,
             COALESCE(SUM(o.total_price), 0) AS total_spent
      FROM users u
      JOIN orders o ON o.shooper_id = u.id AND o.status = 'completed'
      GROUP BY u.id, u.name, u.phone_number, u.department_location
      ORDER BY total_spent DESC, total_orders DESC
      LIMIT 5
    `);

    const topRunnersRes = await pool.query(`
      SELECT u.name, u.phone_number, COALESCE(u.assigned_zone, 'All') AS assigned_zone,
             COUNT(o.id) AS completed_deliveries,
             COALESCE(SUM(o.delivery_fee), 0) AS total_delivery_earned
      FROM users u
      JOIN orders o ON o.runner_id = u.id AND o.status = 'completed'
      GROUP BY u.id, u.name, u.phone_number, u.assigned_zone
      ORDER BY completed_deliveries DESC
      LIMIT 5
    `);

    const topMerchantsRes = await pool.query(`
      SELECT m.name AS merchant_name, m.phone_number,
             COALESCE(SUM(oi.quantity), 0) AS total_items_sold,
             COALESCE(SUM(oi.quantity * oi.price_per_item), 0) AS total_sales
      FROM merchants m
      JOIN menus mn ON mn.merchant_id = m.id
      JOIN order_items oi ON oi.menu_id = mn.id
      JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
      GROUP BY m.id, m.name, m.phone_number
      ORDER BY total_items_sold DESC
      LIMIT 5
    `);

    const topLocationsRes = await pool.query(`
      SELECT COALESCE(u.department_location, 'Lokasi Umum') AS location_name,
             COUNT(o.id) AS total_orders,
             COALESCE(SUM(o.total_price), 0) AS total_revenue
      FROM orders o
      JOIN users u ON o.shooper_id = u.id AND o.status = 'completed'
      GROUP BY u.department_location
      ORDER BY total_orders DESC
      LIMIT 5
    `);

    const mainStats = statsRes.rows[0];
    const itemStats = itemFeeRes.rows[0];

    const grossGmv = parseFloat(mainStats.total_revenue_gmv);
    const serviceFeeTotal = parseFloat(mainStats.total_service_fee);
    const itemFeeTotal = parseFloat(itemStats.total_item_fees);
    const netProfitApp = serviceFeeTotal + itemFeeTotal;

    res.json({
      summary: {
        total_orders: parseInt(mainStats.total_orders),
        completed_orders: parseInt(mainStats.completed_orders),
        pending_orders: parseInt(mainStats.pending_orders),
        total_items_sold: parseInt(itemStats.total_items_sold),
        gross_gmv: grossGmv,
        service_fee_total: serviceFeeTotal,
        item_fee_total: itemFeeTotal,
        net_profit_app: netProfitApp
      },
      top_shoopers: topShoopersRes.rows,
      top_runners: topRunnersRes.rows,
      top_merchants: topMerchantsRes.rows,
      top_locations: topLocationsRes.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== API AUTH ADMIN & MERCHANT POS ====================
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (cleanUser === 'yasir' && cleanPass === 'yasir123') {
    res.json({ success: true, token: 'admin-authenticated-token-yasir' });
  } else {
    res.status(401).json({ error: 'Username atau Password Admin salah!' });
  }
});

app.post('/api/auth/login-merchant', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }

    const resMerchant = await pool.query(
      'SELECT id, name, phone_number, COALESCE(is_open, TRUE) AS is_open, COALESCE(pin, \'123456\') AS pin FROM merchants WHERE phone_number = $1',
      [formattedPhone]
    );

    if (resMerchant.rows.length === 0) {
      return res.status(404).json({ error: 'Nomor WhatsApp Warung belum terdaftar sebagai Merchant.' });
    }

    const merchant = resMerchant.rows[0];
    if (merchant.pin !== (pin || '123456')) {
      return res.status(401).json({ error: 'PIN Kasir Merchant salah!' });
    }

    res.json({ success: true, merchant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/runner/update-zone', async (req, res) => {
  try {
    const { userId, zone } = req.body;
    await pool.query('UPDATE users SET assigned_zone = $1 WHERE id = $2', [zone || 'All', userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== API MASTER LOKASI ====================
app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations WHERE is_active = TRUE ORDER BY area_type ASC, name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function handleSaveLocation(req, res) {
  try {
    const { name, address, area_type, contact_person } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama lokasi wajib diisi' });
    await pool.query(
      'INSERT INTO locations (name, address, area_type, contact_person) VALUES ($1, $2, $3, $4)', 
      [name, address || '', area_type || 'Instansi', contact_person || '']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleUpdateLocation(req, res) {
  try {
    const { id } = req.params;
    const { name, address, area_type, contact_person } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama lokasi wajib diisi' });
    
    await pool.query(
      'UPDATE locations SET name = $1, address = $2, area_type = $3, contact_person = $4 WHERE id = $5',
      [name, address || '', area_type || 'Instansi', contact_person || '', id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleDeleteLocation(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM locations WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.post('/api/admin/locations', handleSaveLocation);
app.put('/api/admin/locations/:id', handleUpdateLocation);
app.delete('/api/admin/locations/:id', handleDeleteLocation);

app.post('/api/runner/locations', handleSaveLocation);
app.put('/api/runner/locations/:id', handleUpdateLocation);
app.delete('/api/runner/locations/:id', handleDeleteLocation);

// ==================== API AUTH SHOOPER & RUNNER ====================
app.post('/api/auth/register-shooper', async (req, res) => {
  try {
    const { name, phone, location, address, map_point } = req.body;
    if (!phone) return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });

    let trimmedPhone = phone.trim();
    if (!trimmedPhone.startsWith('0')) {
      return res.status(400).json({ error: 'Nomor WhatsApp wajib diawali angka 0 (contoh: 081234567890)' });
    }

    const formattedPhone = '62' + trimmedPhone.substring(1);
    const finalName = name && name.trim() !== '' ? name.trim() : `Shooper (${trimmedPhone})`;

    const userRes = await pool.query(
      `INSERT INTO users (name, phone_number, role, department_location, address, map_point, is_approved)
       VALUES ($1, $2, 'shooper', $3, $4, $5, TRUE)
       ON CONFLICT (phone_number) DO UPDATE 
       SET name = EXCLUDED.name, 
           department_location = EXCLUDED.department_location, 
           address = EXCLUDED.address, 
           map_point = EXCLUDED.map_point
       RETURNING id, name, phone_number, role, department_location, address, map_point, reward_balance`,
      [finalName, formattedPhone, location || '', address || '', map_point || '']
    );

    res.json({ success: true, user: userRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login-shooper', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });

    let trimmedPhone = phone.trim();
    let formattedPhone = trimmedPhone;
    if (trimmedPhone.startsWith('0')) {
      formattedPhone = '62' + trimmedPhone.substring(1);
    }

    const userRes = await pool.query(
      'SELECT id, name, phone_number, role, department_location, address, map_point, COALESCE(reward_balance, 0) AS reward_balance FROM users WHERE phone_number = $1 AND role = $2',
      [formattedPhone, 'shooper']
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Nomor HP Shooper belum terdaftar. Silakan daftar terlebih dahulu.' });
    }

    res.json({ success: true, user: userRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }

    const userRes = await pool.query(
      'SELECT id, name, phone_number, role, is_approved, pin, COALESCE(assigned_zone, \'All\') AS assigned_zone FROM users WHERE phone_number = $1',
      [formattedPhone]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const user = userRes.rows[0];

    if (user.pin !== pin) {
      return res.status(401).json({ error: 'PIN/Password salah' });
    }

    if (user.role === 'runner' && !user.is_approved) {
      return res.status(403).json({ error: 'Akun Runner Anda masih menunggu persetujuan Admin' });
    }

    res.json({ success: true, user: { id: user.id, name: user.name, role: user.role, assigned_zone: user.assigned_zone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, phone_number, role, department_location, address, map_point, COALESCE(reward_balance, 0) AS reward_balance, COALESCE(assigned_zone, \'All\') AS assigned_zone, is_approved, created_at FROM users ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/approve-runner/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { approve } = req.body;
    await pool.query('UPDATE users SET is_approved = $1 WHERE id = $2', [approve, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== API MERCHANT & POS ====================
app.get('/api/admin/merchants', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, phone_number, is_active, COALESCE(is_open, TRUE) AS is_open, COALESCE(open_time::text, \'07:00:00\') AS open_time, COALESCE(close_time::text, \'17:00:00\') AS close_time, COALESCE(pin, \'123456\') AS pin FROM merchants ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/merchant/dashboard/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    const mRes = await pool.query('SELECT id, name, phone_number, is_open, open_time, close_time FROM merchants WHERE id = $1', [merchantId]);
    if (mRes.rows.length === 0) return res.status(404).json({ error: 'Merchant tidak ditemukan' });
    const merchant = mRes.rows[0];

    const menuRes = await pool.query('SELECT id, name, price, COALESCE(is_available, TRUE) AS is_available, image_url FROM menus WHERE merchant_id = $1 ORDER BY id DESC', [merchantId]);

    const orderRes = await pool.query(`
      SELECT o.id AS order_id, o.status, o.total_price, o.created_at,
             u.name AS shooper_name, u.phone_number, u.department_location,
             STRING_AGG(CONCAT(oi.quantity, 'x ', mn.name, ' (Rp ', oi.price_per_item, ')'), ', ') AS items_summary
      FROM orders o
      JOIN users u ON o.shooper_id = u.id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN menus mn ON oi.menu_id = mn.id
      WHERE mn.merchant_id = $1 AND o.status IN ('confirmed', 'preparing', 'completed')
      GROUP BY o.id, o.status, o.total_price, o.created_at, u.name, u.phone_number, u.department_location
      ORDER BY o.id DESC
      LIMIT 20
    `, [merchantId]);

    res.json({
      merchant,
      menus: menuRes.rows,
      orders: orderRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/merchant/menu-toggle/:menuId', async (req, res) => {
  try {
    const { menuId } = req.params;
    const { is_available } = req.body;
    await pool.query('UPDATE menus SET is_available = $1 WHERE id = $2', [is_available, menuId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/merchants/active', async (req, res) => {
  try {
    const query = `
      SELECT m.id AS merchant_id, m.name AS merchant_name, m.phone_number,
             COALESCE(m.is_open, TRUE) AS is_open,
             COALESCE(m.open_time::text, '07:00:00') AS open_time,
             COALESCE(m.close_time::text, '17:00:00') AS close_time,
             (CURRENT_TIME BETWEEN COALESCE(m.open_time, '00:00:00'::time) AND COALESCE(m.close_time, '23:59:59'::time)) AS is_within_hours,
             mn.id AS menu_id, mn.name AS menu_name, mn.price AS original_price,
             COALESCE(mn.merchant_discount, 0) AS merchant_discount,
             COALESCE(mn.fee_per_item, 1000) AS fee_per_item,
             COALESCE(mn.is_available, TRUE) AS is_available,
             mn.image_url
      FROM merchants m
      LEFT JOIN menus mn ON m.id = mn.merchant_id AND mn.is_available = TRUE
      WHERE m.is_active = TRUE
      ORDER BY m.id, mn.id
    `;
    const result = await pool.query(query);
    
    const merchants = {};
    result.rows.forEach(row => {
      if (!merchants[row.merchant_id]) {
        const isOpenReal = row.is_open && row.is_within_hours;
        
        merchants[row.merchant_id] = {
          id: row.merchant_id,
          name: row.merchant_name,
          phone: row.phone_number,
          is_open: isOpenReal,
          is_open_manual: row.is_open,
          open_time: row.open_time.substring(0, 5),
          close_time: row.close_time.substring(0, 5),
          menus: []
        };
      }
      if (row.menu_id && row.is_available) {
        const origPrice = parseFloat(row.original_price);
        const feeItem = parseFloat(row.fee_per_item);
        const finalSellPrice = origPrice + feeItem;

        merchants[row.merchant_id].menus.push({
          id: row.menu_id,
          name: row.menu_name,
          original_price: origPrice,
          merchant_discount: parseFloat(row.merchant_discount),
          fee_per_item: feeItem,
          price: finalSellPrice,
          image_url: row.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'
        });
      }
    });

    res.json(Object.values(merchants));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function handleSaveMerchant(req, res) {
  try {
    const { name, phone, open_time, close_time, pin } = req.body;
    let formattedPhone = (phone || '').trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }
    await pool.query(
      'INSERT INTO merchants (name, phone_number, open_time, close_time, is_open, pin) VALUES ($1, $2, $3, $4, TRUE, $5)',
      [name, formattedPhone, open_time || '07:00', close_time || '17:00', pin || '123456']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleToggleMerchantOpen(req, res) {
  try {
    const { id } = req.params;
    const { is_open } = req.body;
    await pool.query('UPDATE merchants SET is_open = $1 WHERE id = $2', [is_open, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleUpdateMerchantHours(req, res) {
  try {
    const { id } = req.params;
    const { name, phone, open_time, close_time, pin } = req.body;
    let formattedPhone = (phone || '').trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }
    await pool.query(
      'UPDATE merchants SET name = $1, phone_number = $2, open_time = $3, close_time = $4, pin = COALESCE($5, pin) WHERE id = $6',
      [name, formattedPhone, open_time, close_time, pin, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.post('/api/admin/merchants', handleSaveMerchant);
app.post('/api/admin/merchants/toggle-open/:id', handleToggleMerchantOpen);
app.put('/api/admin/merchants/:id', handleUpdateMerchantHours);

app.post('/api/runner/merchants', handleSaveMerchant);
app.post('/api/runner/merchants/toggle-open/:id', handleToggleMerchantOpen);
app.put('/api/runner/merchants/:id', handleUpdateMerchantHours);

app.post('/api/admin/menus', async (req, res) => {
  try {
    const { merchant_id, name, price, merchant_discount, fee_per_item, image_url } = req.body;
    const finalImg = image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80';
    
    await pool.query(
      `INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url, is_available) 
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
      [merchant_id, name, price, merchant_discount || 0, fee_per_item || 1000, finalImg]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== AUTO-ASSIGN WORKER ====================
async function triggerAutoAssignFallback() {
  try {
    const staleOrders = await pool.query(`
      SELECT o.id, l.area_type
      FROM orders o
      JOIN users u ON o.shooper_id = u.id
      LEFT JOIN locations l ON u.department_location = l.name
      WHERE o.status IN ('pending_confirmation', 'confirmed')
        AND o.runner_id IS NULL
        AND o.created_at < NOW() - INTERVAL '3 minutes'
    `);

    for (const ord of staleOrders.rows) {
      const area = ord.area_type || 'Umum';
      const runnerRes = await pool.query(`
        SELECT u.id, COUNT(o.id) AS active_load
        FROM users u
        LEFT JOIN orders o ON o.runner_id = u.id AND o.status IN ('pending_confirmation', 'confirmed')
        WHERE u.role = 'runner' AND u.is_approved = TRUE
          AND (u.assigned_zone = $1 OR u.assigned_zone = 'All')
        GROUP BY u.id
        ORDER BY active_load ASC
        LIMIT 1
      `, [area]);

      if (runnerRes.rows.length > 0) {
        const assignedRunnerId = runnerRes.rows[0].id;
        await pool.query(
          `UPDATE orders SET runner_id = $1, claimed_at = NOW() WHERE id = $2`,
          [assignedRunnerId, ord.id]
        );
      }
    }
  } catch (err) {
    console.error('Auto-Assign Error:', err.message);
  }
}

setInterval(triggerAutoAssignFallback, 30000);

app.get('/api/shooper/my-orders', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Nomor WA wajib diisi' });

    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }

    const query = `
      SELECT o.id AS order_id, o.status, o.total_price, o.created_at,
             r.name AS runner_name,
             STRING_AGG(CONCAT(oi.quantity, 'x ', mn.name), ', ') AS items_summary
      FROM orders o
      JOIN users u ON o.shooper_id = u.id
      LEFT JOIN users r ON o.runner_id = r.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menus mn ON oi.menu_id = mn.id
      WHERE u.phone_number = $1
      GROUP BY o.id, o.status, o.total_price, o.created_at, r.name
      ORDER BY o.id DESC
      LIMIT 10
    `;
    const result = await pool.query(query, [formattedPhone]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== API ORDERS & PDF RECEIPT ====================
app.post('/api/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, phone, location, notes, items, use_reward_amount } = req.body;

    if (!name || !phone || !items || items.length === 0) {
      return res.status(400).json({ error: 'Data pemesan atau pesanan tidak lengkap' });
    }

    const feeRes = await client.query("SELECT value FROM settings WHERE key = 'service_fee'");
    const serviceFee = feeRes.rows.length > 0 ? parseFloat(feeRes.rows[0].value) : 2000.00;

    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }

    await client.query('BEGIN');

    let userRes = await client.query('SELECT id, COALESCE(reward_balance, 0) AS reward_balance FROM users WHERE phone_number = $1', [formattedPhone]);
    let userId;
    let currentBalance = 0;

    if (userRes.rows.length === 0) {
      const newUser = await client.query(
        'INSERT INTO users (name, phone_number, role, department_location) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, formattedPhone, 'shooper', location]
      );
      userId = newUser.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
      currentBalance = parseFloat(userRes.rows[0].reward_balance);
      await client.query('UPDATE users SET department_location = $1 WHERE id = $2', [location, userId]);
    }

    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    const deliveryFee = 3000.00;
    let grandTotal = subtotal + serviceFee + deliveryFee;

    let usedReward = 0;
    if (use_reward_amount && use_reward_amount > 0) {
      usedReward = Math.min(currentBalance, use_reward_amount);
      grandTotal = Math.max(0, grandTotal - usedReward);

      await client.query('UPDATE users SET reward_balance = reward_balance - $1 WHERE id = $2', [usedReward, userId]);
    }

    const orderRes = await client.query(
      `INSERT INTO orders (shooper_id, status, total_price, delivery_fee, service_fee, payment_method) 
       VALUES ($1, 'pending_confirmation', $2, $3, $4, 'COD') RETURNING id`,
      [userId, grandTotal, deliveryFee, serviceFee]
    );
    const orderId = orderRes.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_id, quantity, notes, price_per_item)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.menu_id, item.quantity, notes || '', item.price]
      );
    }

    await client.query('COMMIT');

    const updatedUser = await pool.query('SELECT COALESCE(reward_balance, 0) AS reward_balance FROM users WHERE id = $1', [userId]);
    
    res.json({ 
      success: true, 
      order_id: orderId, 
      new_reward_balance: updatedUser.rows[0].reward_balance,
      message: 'Pesanan berhasil disimpan! Runner akan mengonfirmasi via WhatsApp.' 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/orders/receipt-pdf/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderRes = await pool.query(`
      SELECT o.id, o.total_price, o.delivery_fee, o.service_fee, o.status, o.created_at,
             u.name AS shooper_name, u.phone_number, u.department_location,
             r.name AS runner_name
      FROM orders o
      JOIN users u ON o.shooper_id = u.id
      LEFT JOIN users r ON o.runner_id = r.id
      WHERE o.id = $1
    `, [orderId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).send('Pesanan tidak ditemukan');
    }

    const order = orderRes.rows[0];

    const itemsRes = await pool.query(`
      SELECT oi.quantity, oi.price_per_item, mn.name AS menu_name
      FROM order_items oi
      JOIN menus mn ON oi.menu_id = mn.id
      WHERE oi.order_id = $1
    `, [orderId]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Struk-TitipShoopy-#${orderId}.pdf`);

    const doc = new PDFDocument({ size: [226, 480], margin: 15 });
    doc.pipe(res);

    doc.fontSize(12).font('Helvetica-Bold').text('TITIP SHOOPY', { align: 'center' });
    doc.fontSize(8).font('Helvetica').text('Hyperlocal Food Delivery & Jastip', { align: 'center' });
    doc.text('https://titip.shoopy.my.id', { align: 'center' });
    doc.text('------------------------------------------------------------', { align: 'center' });

    doc.fontSize(8).font('Helvetica-Bold').text(`Order ID : #${order.id}`);
    doc.font('Helvetica').text(`Pemesan  : ${order.shooper_name}`);
    doc.text(`Lokasi   : ${order.department_location || '-'}`);
    doc.text(`Tanggal  : ${new Date(order.created_at).toLocaleString('id-ID')}`);
    doc.text('------------------------------------------------------------', { align: 'center' });

    doc.font('Helvetica-Bold').text('Rincian Pesanan:');
    itemsRes.rows.forEach(item => {
      const subtotalItem = item.quantity * parseFloat(item.price_per_item);
      doc.font('Helvetica').text(`${item.quantity}x ${item.menu_name}`);
      doc.text(`   @Rp ${parseFloat(item.price_per_item).toLocaleString('id-ID')} = Rp ${subtotalItem.toLocaleString('id-ID')}`);
    });

    doc.text('------------------------------------------------------------', { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(9).text(`TOTAL TAGIHAN COD: Rp ${parseFloat(order.total_price).toLocaleString('id-ID')}`);
    doc.text('------------------------------------------------------------', { align: 'center' });
    
    doc.fontSize(7).font('Helvetica').text(`Runner: ${order.runner_name || 'Tim Shoopy'}`, { align: 'center' });
    doc.text('Status: LUNAS & SELESAI', { align: 'center' });
    doc.text('Terima kasih telah memesan!', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Scan & Buka E-Catalog:', { align: 'center' });
    doc.fillColor('blue').text('https://titip.shoopy.my.id', { align: 'center', link: 'https://titip.shoopy.my.id' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/runner/claim-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { runnerId } = req.body;

    if (!runnerId) return res.status(400).json({ error: 'Runner ID wajib ada' });

    const checkRes = await pool.query('SELECT runner_id FROM orders WHERE id = $1', [orderId]);
    if (checkRes.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });

    const existingRunner = checkRes.rows[0].runner_id;
    if (existingRunner && existingRunner !== parseInt(runnerId)) {
      return res.status(400).json({ error: 'Pesanan ini sudah diklaim oleh Runner lain!' });
    }

    await pool.query(
      `UPDATE orders SET runner_id = $1, claimed_at = NOW() WHERE id = $2`,
      [runnerId, orderId]
    );

    res.json({ success: true, message: 'Pesanan berhasil dikunci!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/runner/confirm-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    await pool.query("UPDATE orders SET status = 'confirmed' WHERE id = $1", [orderId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/runner/complete-order/:orderId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { orderId } = req.params;

    const rewardSetting = await client.query("SELECT value FROM settings WHERE key = 'reward_per_item'");
    const rewardPerItem = rewardSetting.rows.length > 0 ? parseFloat(rewardSetting.rows[0].value) : 500.00;

    await client.query('BEGIN');

    await client.query("UPDATE orders SET status = 'completed', is_paid = TRUE WHERE id = $1", [orderId]);

    const orderDetail = await client.query(`
      SELECT o.shooper_id, SUM(oi.quantity) AS total_qty
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.shooper_id
    `, [orderId]);

    if (orderDetail.rows.length > 0) {
      const shooperId = orderDetail.rows[0].shooper_id;
      const totalQty = parseInt(orderDetail.rows[0].total_qty);
      const earnedReward = totalQty * rewardPerItem;

      await client.query('UPDATE users SET reward_balance = COALESCE(reward_balance, 0) + $1 WHERE id = $2', [earnedReward, shooperId]);
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/runner/delivery-summary', async (req, res) => {
  try {
    const runnerId = req.query.runner_id;
    const runnerZone = req.query.zone || 'All';

    await triggerAutoAssignFallback();

    let query = `
      SELECT o.id AS order_id, 
             u.name AS shooper_name, 
             COALESCE(u.department_location, 'Lokasi Umum') AS department_location, 
             u.phone_number,
             o.total_price, 
             o.status,
             o.runner_id,
             r.name AS runner_name,
             COALESCE(l.area_type, 'Umum') AS area_type,
             STRING_AGG(CONCAT(oi.quantity, 'x ', mn.name), ', ') AS items_summary
      FROM orders o
      JOIN users u ON o.shooper_id = u.id
      LEFT JOIN locations l ON u.department_location = l.name
      LEFT JOIN users r ON o.runner_id = r.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menus mn ON oi.menu_id = mn.id
      WHERE o.status IN ('pending_confirmation', 'confirmed')
    `;

    const params = [];
    
    if (runnerId) {
      params.push(runnerId);
      if (runnerZone !== 'All') {
        params.push(runnerZone);
        query += ` AND (o.runner_id = $1 OR (o.runner_id IS NULL AND COALESCE(l.area_type, 'Umum') = $2))`;
      } else {
        query += ` AND (o.runner_id = $1 OR o.runner_id IS NULL)`;
      }
    }

    query += `
      GROUP BY o.id, u.name, u.department_location, u.phone_number, o.total_price, o.status, o.runner_id, r.name, l.area_type
      ORDER BY u.department_location ASC, o.id DESC
    `;

    const result = await pool.query(query, params);

    const grouped = {};
    result.rows.forEach(row => {
      const loc = row.department_location;
      if (!grouped[loc]) {
        grouped[loc] = {
          location_name: loc,
          area_type: row.area_type,
          total_cod_group: 0,
          orders: []
        };
      }
      grouped[loc].total_cod_group += parseFloat(row.total_price);
      grouped[loc].orders.push(row);
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/runner/wa-link/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const merchantRes = await pool.query('SELECT * FROM merchants WHERE id = $1', [merchantId]);
    if (merchantRes.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant tidak ditemukan' });
    }
    const merchant = merchantRes.rows[0];

    const itemsRes = await pool.query(`
      SELECT mn.name AS menu_name, SUM(oi.quantity) AS total_qty
      FROM order_items oi
      JOIN menus mn ON oi.menu_id = mn.id
      JOIN orders o ON oi.order_id = o.id
      WHERE mn.merchant_id = $1 AND o.status = 'confirmed'
      GROUP BY mn.name
    `, [merchantId]);

    let itemDetails = '';
    let totalPorsi = 0;

    if (itemsRes.rows.length > 0) {
      itemsRes.rows.forEach(item => {
        itemDetails += `• ${item.total_qty}x ${item.menu_name}\n`;
        totalPorsi += parseInt(item.total_qty);
      });
    } else {
      itemDetails = '• Belum ada pesanan terkonfirmasi\n';
    }

    const orderText = `Halo ${merchant.name}, saya Runner dari Titip Shoopy.
Mohon disiapkan pesanan berikut untuk diambil estimasi 15 menit lagi:

${itemDetails}
Total Porsi: ${totalPorsi}. Terima kasih!`;

    const encodedText = encodeURIComponent(orderText);
    const waUrl = `https://wa.me/${merchant.phone_number}?text=${encodedText}`;

    res.json({
      merchant_name: merchant.name,
      phone_number: merchant.phone_number,
      wa_url: waUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Titip Shoopy App running on port ${port}`);
});
