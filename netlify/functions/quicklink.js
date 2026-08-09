const { getDb } = require('./lib/db');
const { json, randomToken } = require('./lib/helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { quickToken } = JSON.parse(event.body || '{}');
    if (!quickToken) return json(400, { error: 'رابط غير صالح' });

    const db = await getDb();
    const user = await db.collection('users').findOne({ quickToken, quickTokenUsed: false });
    if (!user) return json(401, { error: 'هذا الرابط غير صالح أو تم استخدامه من قبل' });

    // نلغي الرابط فوراً (صالح لمرة وحدة فقط)
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { quickTokenUsed: true }, $unset: { quickToken: '' } }
    );

    const token = randomToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.collection('sessions').insertOne({
      token, type: 'user', username: user.username, createdAt: new Date(), expiresAt
    });

    return json(200, { token, username: user.username, nickname: user.nickname || null });
  } catch (err) {
    return json(500, { error: 'خطأ في السيرفر', detail: err.message });
  }
};
