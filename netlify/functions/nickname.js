const { getDb } = require('./lib/db');
const { json, requireSession } = require('./lib/helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { nickname } = JSON.parse(event.body || '{}');
    const clean = (nickname || '').trim().slice(0, 24);
    if (!clean) return json(400, { error: 'اكتب اسم مستعار' });

    const db = await getDb();
    const session = await requireSession(db, event, 'user');
    if (!session) return json(401, { error: 'سجل دخولك أولاً' });

    await db.collection('users').updateOne(
      { username: session.username },
      { $set: { nickname: clean } }
    );

    return json(200, { nickname: clean });
  } catch (err) {
    return json(500, { error: 'خطأ في السيرفر', detail: err.message });
  }
};
