const bcrypt = require('bcryptjs');
const { getDb } = require('./lib/db');
const { json, randomToken } = require('./lib/helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { username, password } = JSON.parse(event.body || '{}');
    if (!username || !password) return json(400, { error: 'اكتب اسم المستخدم وكلمة المرور' });

    const db = await getDb();
    const user = await db.collection('users').findOne({ username: username.trim() });
    if (!user) return json(401, { error: 'بيانات الدخول غير صحيحة' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return json(401, { error: 'بيانات الدخول غير صحيحة' });

    const token = randomToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 يوم
    await db.collection('sessions').insertOne({
      token, type: 'user', username: user.username, createdAt: new Date(), expiresAt
    });

    return json(200, { token, username: user.username, nickname: user.nickname || null });
  } catch (err) {
    return json(500, { error: 'خطأ في السيرفر', detail: err.message });
  }
};
