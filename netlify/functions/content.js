const { getDb } = require('./lib/db');
const { json, requireSession } = require('./lib/helpers');

// القيم الافتراضية لو ما فيه شي محفوظ بعد بقاعدة البيانات
const DEFAULTS = {
  key: 'pricing',
  popular: 'family',
  individual: {
    price: '—',
    note: 'تفعيل على حسابك الشخصي مباشرة',
    features: [
      'بدون إعلانات نهائياً',
      'تحميل الفيديوهات والاستماع بالخلفية',
      'يوتيوب ميوزيك بريميوم مشمول',
      'تفعيل فوري بضغطة واحدة'
    ]
  },
  family: {
    price: '—',
    note: 'دعوة ضمن عائلة، حتى 5 أفراد إضافيين',
    features: [
      'كل مميزات الاشتراك الفردي',
      'تقدر تشارك حتى 5 دعوات لعائلتك',
      'حساب مستقل خاص فيك داخل العائلة',
      'ضمان ذهبي 25 يوم يغطي الاشتراك بالكامل'
    ]
  }
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const db = await getDb();

    if (event.httpMethod === 'GET') {
      // متاح للجميع بدون تسجيل دخول (الصفحة الرئيسية تحتاجه)
      const doc = await db.collection('content').findOne({ key: 'pricing' });
      return json(200, { pricing: doc || DEFAULTS });
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
      // خاص بالداشبورد فقط
      const session = await requireSession(db, event, 'dashboard');
      if (!session) return json(401, { error: 'غير مصرح' });

      const body = JSON.parse(event.body || '{}');
      const clean = (plan) => {
        if (!plan || typeof plan !== 'object') return null;
        const price = String(plan.price || '').trim().slice(0, 30) || '—';
        const note = String(plan.note || '').trim().slice(0, 150);
        const features = Array.isArray(plan.features)
          ? plan.features.map(f => String(f).trim().slice(0, 120)).filter(Boolean).slice(0, 12)
          : [];
        return { price, note, features };
      };

      const individual = clean(body.individual) || DEFAULTS.individual;
      const family = clean(body.family) || DEFAULTS.family;
      const popular = ['individual', 'family', 'none'].includes(body.popular) ? body.popular : 'family';

      await db.collection('content').updateOne(
        { key: 'pricing' },
        { $set: { key: 'pricing', individual, family, popular, updatedAt: new Date() } },
        { upsert: true }
      );

      return json(200, { ok: true, pricing: { individual, family, popular } });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: 'خطأ في السيرفر', detail: err.message });
  }
};
