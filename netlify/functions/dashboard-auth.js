const { getDb } = require('./lib/db');
const { json, randomToken, isValidDashboardPassword } = require('./lib/helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { password } = JSON.parse(event.body || '{}');

    if (!isValidDashboardPassword(password)) {
      return json(401, { error: 'كلمة المرور غير صحيحة' });
    }

    const db = await getDb();
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // ساعتين

    await db.collection('sessions').insertOne({
      token, type: 'dashboard', createdAt: new Date(), expiresAt
    });

    return json(200, { token });
  } catch (err) {
    return json(500, { error: 'خطأ في السيرفر', detail: err.message });
  }
};
