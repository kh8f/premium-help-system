const { getDb } = require('./lib/db');
const { json, requireSession } = require('./lib/helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const db = await getDb();
    const session = await requireSession(db, event, 'dashboard');
    if (!session) return json(401, { error: 'غير مصرح' });

    if (event.httpMethod === 'GET') {
      const users = await db.collection('users')
        .find({}, { projection: { username: 1, nickname: 1, createdAt: 1, quickTokenUsed: 1 } })
        .sort({ createdAt: -1 })
        .toArray();
      return json(200, { users });
    }

    if (event.httpMethod === 'DELETE') {
      const { username } = JSON.parse(event.body || '{}');
      if (!username) return json(400, { error: 'اسم المستخدم مطلوب' });

      await db.collection('users').deleteOne({ username });
      // نلغي أي جلسة دخول فعالة لهذا الحساب فوراً
      await db.collection('sessions').deleteMany({ type: 'user', username });

      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: 'خطأ في السيرفر', detail: err.message });
  }
};
