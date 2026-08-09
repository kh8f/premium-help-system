const { ObjectId } = require('mongodb');
const { getDb } = require('./lib/db');
const { json, requireSession } = require('./lib/helpers');

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const db = await getDb();

    if (event.httpMethod === 'GET') {
      const ratings = await db.collection('ratings')
        .find({}, { projection: { nickname: 1, stars: 1, description: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();
      const count = await db.collection('ratings').countDocuments();
      return json(200, { ratings, count });
    }

    if (event.httpMethod === 'POST') {
      const session = await requireSession(db, event, 'user');
      if (!session) return json(401, { error: 'سجل دخولك أولاً' });

      const user = await db.collection('users').findOne({ username: session.username });
      if (!user || !user.nickname) return json(400, { error: 'لازم تختار اسم مستعار أولاً' });

      // تقييم واحد كل شهر لكل مستخدم
      const lastRating = await db.collection('ratings')
        .find({ username: user.username })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();
      if (lastRating.length && (Date.now() - new Date(lastRating[0].createdAt).getTime()) < ONE_MONTH_MS) {
        return json(400, { error: 'قيّمت الخدمة خلال آخر شهر، تقدر تقيّم مرة ثانية بعد فترة' });
      }

      const { stars, description } = JSON.parse(event.body || '{}');
      const s = Number(stars);
      if (!s || s < 1 || s > 5) return json(400, { error: 'اختر تقييم من 1 إلى 5 نجوم' });
      const desc = (description || '').trim().slice(0, 500);

      const doc = {
        username: user.username,
        nickname: user.nickname,
        stars: s,
        description: desc,
        createdAt: new Date()
      };
      await db.collection('ratings').insertOne(doc);

      return json(200, { ok: true, rating: doc });
    }

    if (event.httpMethod === 'DELETE') {
      const session = await requireSession(db, event, 'dashboard');
      if (!session) return json(401, { error: 'غير مصرح' });

      const { id } = JSON.parse(event.body || '{}');
      if (!id) return json(400, { error: 'معرّف التقييم مطلوب' });

      await db.collection('ratings').deleteOne({ _id: new ObjectId(id) });
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: 'خطأ في السيرفر', detail: err.message });
  }
};
