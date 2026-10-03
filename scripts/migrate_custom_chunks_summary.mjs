import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function migrate() {
  console.log('=== BẮT ĐẦU MIGRATION SANG BUCKET SHARDING SUMMARY ===');
  
  const usersSnap = await db.collection('users').get();
  console.log(`Tìm thấy ${usersSnap.size} users trong database.`);

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    console.log(`\nKiểm tra UID: ${uid}...`);

    const customChunksCol = db.collection('users').doc(uid).collection('customChunks');
    const customSnap = await customChunksCol.get();

    if (customSnap.empty) {
      console.log(`  -> User ${uid} không có custom chunks, bỏ qua.`);
      continue;
    }

    console.log(`  -> Tìm thấy ${customSnap.size} custom chunks của user ${uid}.`);

    const bucketData = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    let totalBytes = 0;
    customSnap.forEach((doc) => {
      const data = doc.data();
      bucketData[doc.id] = data;
      totalBytes += Buffer.byteLength(JSON.stringify(data));
    });

    console.log(`  -> Tổng dung lượng bucket_1: ${(totalBytes / 1024).toFixed(2)} KB (Giới hạn 1 document: 1024 KB).`);

    // Ghi vào custom_chunks_summary/bucket_1
    const summaryDocRef = db.collection('users').doc(uid).collection('custom_chunks_summary').doc('bucket_1');
    await summaryDocRef.set(bucketData, { merge: true });
    console.log(`  ✅ Đã ghi thành công ${customSnap.size} chunks vào custom_chunks_summary/bucket_1.`);

    // Cập nhật stats/current
    const statsDocRef = db.collection('users').doc(uid).collection('stats').doc('current');
    await statsDocRef.set({
      customChunksCount: customSnap.size,
      customChunkBucketIds: ['bucket_1'],
      activeCustomChunkBucket: 'bucket_1',
      lastCustomChunksUpdatedAt: Date.now(),
    }, { merge: true });

    console.log(`  ✅ Đã cập nhật metadata customChunkBucketIds vào stats/current.`);
  }

  console.log('\n=== MIGRATION HOÀN TẤT THÀNH CÔNG ===');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
