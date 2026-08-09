const { getDb } = require('./lib/db');
const { json, requireSession } = require('./lib/helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const db = await getDb();

    if (event.httpMethod === 'POST') {
      const { text } = JSON.parse(event.body || '{}');
      const clean = (text || '').trim().slice(0, 800);
      if (!clean) return json(400, { error: 'اكتب اقتراحك' });

      // إذا مسجل دخول نربط الاقتراح باسمه المستعار، وإلا "زائر"
      let nickname = 'زائر';
      const session = await requireSession(db, event, 'user');
      if (session) {
        const user = await db.collection('users').findOne({ username: session.username });
        if (user && user.nickname) nickname = user.nickname;
      }

      await db.collection('suggestions').insertOne({
        nickname, text: clean, createdAt: new Date()
      });
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'GET') {
      const session = await requireSession(db, event, 'dashboard');
      if (!session) return json(401, { error: 'غير مصرح' });

      const suggestions = await db.collection('suggestions')
        .find({}).sort({ createdAt: -1 }).limit(300).toArray();
      return json(200, { suggestions });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: 'خطأ في السيرفر', detail: err.message });
  }
};
