const { getDb } = require('./lib/db');
const { json, requireSession } = require('./lib/helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const db = await getDb();

    if (event.httpMethod === 'POST') {
      // متاح للجميع بدون تسجيل دخول (تقييم مجهول لكل سؤال)
      const { question, type } = JSON.parse(event.body || '{}');
      if (!question || !['positive', 'negative'].includes(type)) {
        return json(400, { error: 'بيانات غير صحيحة' });
      }
      await db.collection('feedback').insertOne({
        question: String(question).slice(0, 200),
        type,
        createdAt: new Date()
      });
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'GET') {
      // خاص بالداشبورد فقط
      const session = await requireSession(db, event, 'dashboard');
      if (!session) return json(401, { error: 'غير مصرح' });

      const agg = await db.collection('feedback').aggregate([
        { $group: { _id: { question: '$question', type: '$type' }, count: { $sum: 1 } } }
      ]).toArray();

      const stats = {};
      for (const row of agg) {
        const q = row._id.question;
        if (!stats[q]) stats[q] = { positive: 0, negative: 0 };
        stats[q][row._id.type] = row.count;
      }
      return json(200, { stats });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: 'خطأ في السيرفر', detail: err.message });
  }
};
