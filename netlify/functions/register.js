const bcrypt = require('bcryptjs');
const { getDb } = require('./lib/db');
const { json, randomToken, randomPassword, randomUsername, requireSession } = require('./lib/helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const db = await getDb();
    const session = await requireSession(db, event, 'dashboard');
    if (!session) return json(401, { error: 'غير مصرح - سجل دخول للداشبورد أولاً' });

    let username = randomUsername();
    // نتأكد ما فيه تكرار
    for (let i = 0; i < 5; i++) {
      const exists = await db.collection('users').findOne({ username });
      if (!exists) break;
      username = randomUsername();
    }

    const plainPassword = randomPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const quickToken = randomToken(16);

    await db.collection('users').insertOne({
      username,
      passwordHash,
      nickname: null,
      quickToken,
      quickTokenUsed: false,
      createdAt: new Date()
    });

    const siteUrl = process.env.SITE_URL || '';
    const quickLink = `${siteUrl}?ql=${quickToken}`;

    return json(200, { username, password: plainPassword, quickToken, quickLink });
  } catch (err) {
    return json(500, { error: 'خطأ في السيرفر', detail: err.message });
  }
};
