const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI غير موجود في متغيرات البيئة (Environment Variables) في Netlify');
  }

  const client = new MongoClient(uri);
  await client.connect();

  cachedClient = client;
  cachedDb = client.db(process.env.MONGODB_DB || 'premiumhelp');

  // فهارس مفيدة (تُنشأ مرة واحدة فقط، آمنة التكرار)
  await cachedDb.collection('users').createIndex({ username: 1 }, { unique: true });
  await cachedDb.collection('users').createIndex({ quickToken: 1 });
  await cachedDb.collection('sessions').createIndex({ token: 1 }, { unique: true });
  await cachedDb.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await cachedDb.collection('content').createIndex({ key: 1 }, { unique: true });

  return cachedDb;
}

module.exports = { getDb };
