const crypto = require('crypto');

function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify(data)
  };
}

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

// كلمة مرور بسيطة عشوائية للحسابات الجديدة (سهلة النطق/النسخ)
function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[crypto.randomInt(0, chars.length)];
  return out;
}

function randomUsername() {
  const n = crypto.randomInt(1000, 9999);
  return 'user' + n;
}

// كلمة مرور الداشبورد: ثابتة، تُقرأ من متغير البيئة DASHBOARD_PASSWORD في نتلفاي
// (لو ما ضفتها في نتلفاي، تنفع القيمة الافتراضية تحت مؤقتاً)
function isValidDashboardPassword(password) {
  if (typeof password !== 'string') return false;
  const expected = process.env.DASHBOARD_PASSWORD;
  // ما فيه كلمة مرور افتراضية بالكود؛ لازم تُضبط DASHBOARD_PASSWORD في متغيرات بيئة Netlify
  if (!expected) return false;
  return password === expected;
}

function getBearerToken(event) {
  const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  return null;
}

async function requireSession(db, event, type) {
  const token = getBearerToken(event);
  if (!token) return null;
  const session = await db.collection('sessions').findOne({ token, type });
  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) return null;
  return session;
}

module.exports = {
  json,
  randomToken,
  randomPassword,
  randomUsername,
  isValidDashboardPassword,
  getBearerToken,
  requireSession
};
