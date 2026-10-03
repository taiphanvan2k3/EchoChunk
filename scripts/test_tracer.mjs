import assert from 'node:assert/strict';
import test from 'node:test';

// Mock window and CustomEvent for Node.js test environment
class MockCustomEvent {
  constructor(type, detail) {
    this.type = type;
    this.detail = detail?.detail;
  }
}

globalThis.window = {
  dispatchEvent: (event) => {
    globalThis.__lastDispatchedEvent = event;
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.CustomEvent = MockCustomEvent;

// Mock development environment before importing tracer
process.env.NODE_ENV = 'development';

test('=== FIRESTORE TRACER TEST SUITE ===', async (t) => {
  // Import module dynamically
  const {
    firestoreSessionMetrics,
    recordTrace,
    OVERFETCH_THRESHOLD,
    firestoreDriver,
    tracedGetDoc,
    tracedGetDocs,
    tracedSetDoc,
    tracedUpdateDoc,
    tracedDeleteDoc,
    tracedWriteBatch
  } = await import('../src/lib/client/firebase/firestore/tracer/index.ts');

  await t.test('1. Metrics state & reset() functionality', () => {
    firestoreSessionMetrics.reset();
    assert.equal(firestoreSessionMetrics.totalReads, 0);
    assert.equal(firestoreSessionMetrics.totalWrites, 0);
    assert.equal(firestoreSessionMetrics.totalDeletes, 0);
    assert.equal(firestoreSessionMetrics.history.length, 0);

    // Ghi nhận 1 Read
    recordTrace({
      operation: 'getDoc',
      path: 'users/123/stats/current',
      docCount: 1,
      durationMs: 45,
      caller: 'fetchStats',
      status: 'success'
    });

    assert.equal(firestoreSessionMetrics.totalReads, 1);
    assert.equal(firestoreSessionMetrics.history.length, 1);
    assert.equal(firestoreSessionMetrics.history[0].operation, 'getDoc');
    assert.equal(firestoreSessionMetrics.history[0].caller, 'fetchStats');

    // Ghi nhận 1 Write
    recordTrace({
      operation: 'setDoc',
      path: 'users/123/stats/current',
      docCount: 1,
      durationMs: 30,
      caller: 'syncStats',
      status: 'success'
    });

    assert.equal(firestoreSessionMetrics.totalWrites, 1);
    assert.equal(firestoreSessionMetrics.history.length, 2);

    // Ghi nhận 1 Delete
    recordTrace({
      operation: 'deleteDoc',
      path: 'users/123/customChunks/c1',
      docCount: 1,
      durationMs: 25,
      caller: 'deleteChunk',
      status: 'success'
    });

    assert.equal(firestoreSessionMetrics.totalDeletes, 1);
    assert.equal(firestoreSessionMetrics.history.length, 3);

    // Reset
    firestoreSessionMetrics.reset();
    assert.equal(firestoreSessionMetrics.totalReads, 0);
    assert.equal(firestoreSessionMetrics.totalWrites, 0);
    assert.equal(firestoreSessionMetrics.totalDeletes, 0);
    assert.equal(firestoreSessionMetrics.history.length, 0);
  });

  await t.test('2. Query overfetch warning detection', () => {
    firestoreSessionMetrics.reset();

    // Query dưới ngưỡng
    recordTrace({
      operation: 'getDocs',
      path: 'users/123/customChunks',
      docCount: 15,
      durationMs: 50,
      status: 'success'
    });
    assert.equal(firestoreSessionMetrics.totalReads, 15);

    // Query vượt ngưỡng overfetch (> 20)
    recordTrace({
      operation: 'getDocs',
      path: 'users/123/customChunks',
      docCount: 244,
      durationMs: 120,
      status: 'success'
    });
    assert.equal(firestoreSessionMetrics.totalReads, 259);
    assert.ok(244 > OVERFETCH_THRESHOLD, 'Phải vượt quá OVERFETCH_THRESHOLD (20)');
  });

  await t.test('3. CustomEvent dispatching for Dev HUD reactivity', () => {
    let capturedEvent = null;
    globalThis.window.dispatchEvent = (event) => {
      capturedEvent = event;
    };

    recordTrace({
      operation: 'getDoc',
      path: 'users/123/custom_chunks_summary/bucket_1',
      docCount: 1,
      durationMs: 60,
      caller: 'fetchCustomChunks',
      status: 'success'
    });

    assert.ok(capturedEvent, 'Phải dispatch CustomEvent');
    assert.equal(capturedEvent.type, 'firestore-trace');
    assert.equal(capturedEvent.detail.caller, 'fetchCustomChunks');
    assert.equal(capturedEvent.detail.path, 'users/123/custom_chunks_summary/bucket_1');
  });

  await t.test('4. summary() function executes without error', () => {
    assert.doesNotThrow(() => {
      firestoreSessionMetrics.summary();
    });
  });

  await t.test('5. Wrapper: tracedGetDoc (exists, not exists, error handling)', async () => {
    firestoreSessionMetrics.reset();

    // 5a. Doc exists -> 1 read
    firestoreDriver.getDoc = async () => ({
      exists: () => true,
      data: () => ({ name: 'Test User' })
    });
    const snap1 = await tracedGetDoc({ path: 'users/123/stats/current' }, 'fetchStats');
    assert.equal(snap1.exists(), true);
    assert.equal(firestoreSessionMetrics.totalReads, 1);
    assert.equal(firestoreSessionMetrics.history[0].caller, 'fetchStats');
    assert.equal(firestoreSessionMetrics.history[0].status, 'success');

    // 5b. Doc does NOT exist -> 0 reads
    firestoreDriver.getDoc = async () => ({
      exists: () => false,
      data: () => null
    });
    const snap2 = await tracedGetDoc({ path: 'users/123/nonexistent' }, 'fetchMissing');
    assert.equal(snap2.exists(), false);
    assert.equal(firestoreSessionMetrics.totalReads, 1, 'Nonexistent doc must not increment reads');

    // 5c. Driver throws -> records error trace and re-throws
    firestoreDriver.getDoc = async () => {
      throw new Error('permission-denied: access denied');
    };
    await assert.rejects(
      async () => tracedGetDoc({ path: 'users/123/secret' }, 'fetchSecret'),
      /permission-denied/
    );
    const lastLog = firestoreSessionMetrics.history[0];
    assert.equal(lastLog.status, 'error');
    assert.ok(lastLog.errorDetails?.includes('permission-denied'));
  });

  await t.test('6. Wrapper: tracedGetDocs (path resolution, count, error handling)', async () => {
    firestoreSessionMetrics.reset();

    // 6a. Query returns 5 docs
    firestoreDriver.getDocs = async () => ({
      size: 5,
      empty: false,
      docs: [{}, {}, {}, {}, {}]
    });
    const snap = await tracedGetDocs(
      { path: 'users/123/customChunks' },
      'loadChunks'
    );
    assert.equal(snap.size, 5);
    assert.equal(firestoreSessionMetrics.totalReads, 5);
    assert.equal(firestoreSessionMetrics.history[0].caller, 'loadChunks');

    // 6b. Throws error
    firestoreDriver.getDocs = async () => {
      throw new Error('unavailable: network down');
    };
    await assert.rejects(
      async () => tracedGetDocs({ path: 'users/123/customChunks' }),
      /unavailable/
    );
    const lastLog = firestoreSessionMetrics.history[0];
    assert.equal(lastLog.status, 'error');
  });

  await t.test('7. Wrapper: tracedSetDoc (standard, options merge, error handling)', async () => {
    firestoreSessionMetrics.reset();

    let capturedArgs = [];
    firestoreDriver.setDoc = async (...args) => {
      capturedArgs.push(args);
    };

    // 7a. Standard setDoc
    await tracedSetDoc({ path: 'users/123/profile' }, { name: 'Alice' }, 'saveProfile');
    assert.equal(firestoreSessionMetrics.totalWrites, 1);
    assert.equal(capturedArgs[0][1].name, 'Alice');

    // 7b. setDoc with SetOptions { merge: true }
    await tracedSetDoc(
      { path: 'users/123/profile' },
      { theme: 'dark' },
      { merge: true },
      'updateTheme'
    );
    assert.equal(firestoreSessionMetrics.totalWrites, 2);
    assert.deepEqual(capturedArgs[1][2], { merge: true });

    // 7c. Error handling & re-throwing
    firestoreDriver.setDoc = async () => {
      throw new Error('cancelled: quota exceeded');
    };
    await assert.rejects(
      async () => tracedSetDoc({ path: 'users/123/profile' }, { theme: 'light' }),
      /quota exceeded/
    );
    const lastLog = firestoreSessionMetrics.history[0];
    assert.equal(lastLog.status, 'error');
  });

  await t.test('8. Wrapper: tracedUpdateDoc & tracedDeleteDoc', async () => {
    firestoreSessionMetrics.reset();

    let updated = false;
    let deleted = false;
    firestoreDriver.updateDoc = async () => { updated = true; };
    firestoreDriver.deleteDoc = async () => { deleted = true; };

    await tracedUpdateDoc({ path: 'users/123/stats/current' }, { xp: 100 }, 'gainXp');
    assert.equal(updated, true);
    assert.equal(firestoreSessionMetrics.totalWrites, 1);

    await tracedDeleteDoc({ path: 'users/123/customChunks/c1' }, 'deleteChunk');
    assert.equal(deleted, true);
    assert.equal(firestoreSessionMetrics.totalDeletes, 1);

    // Delete error test
    firestoreDriver.deleteDoc = async () => {
      throw new Error('not-found');
    };
    await assert.rejects(
      async () => tracedDeleteDoc({ path: 'users/123/customChunks/c2' }),
      /not-found/
    );
  });

  await t.test('9. Wrapper: tracedWriteBatch (chaining, ops count, commit, and error handling)', async () => {
    firestoreSessionMetrics.reset();

    let commitCalled = false;
    let opsExecuted = [];

    const mockRawBatch = {
      set(ref, data, opts) {
        opsExecuted.push({ type: 'set', ref, data, opts });
        return mockRawBatch;
      },
      update(ref, data) {
        opsExecuted.push({ type: 'update', ref, data });
        return mockRawBatch;
      },
      delete(ref) {
        opsExecuted.push({ type: 'delete', ref });
        return mockRawBatch;
      },
      commit: async () => {
        commitCalled = true;
      }
    };

    firestoreDriver.writeBatch = () => mockRawBatch;

    const batch = tracedWriteBatch(null, 'syncBatch');

    // Chaining test: batch.set().update().delete() must return the same batch instance
    const chained = batch
      .set({ path: 'users/123/chunks/c1' }, { text: 'chunk 1' })
      .update({ path: 'users/123/stats/current' }, { count: 1 })
      .delete({ path: 'users/123/chunks/c2' });

    assert.equal(chained, batch, 'Chaining must return the wrapped batch instance');
    assert.equal(opsExecuted.length, 3, 'Underlying batch must receive all 3 operations');
    assert.equal(commitCalled, false, 'Batch must not be committed before commit() call');

    await batch.commit();
    assert.equal(commitCalled, true, 'Commit must be called');
    assert.equal(firestoreSessionMetrics.totalWrites, 3, 'Total writes must increase by 3');
    assert.equal(firestoreSessionMetrics.history[0].caller, 'syncBatch');
    assert.equal(firestoreSessionMetrics.history[0].operation, 'writeBatch');
    assert.equal(firestoreSessionMetrics.history[0].status, 'success');

    // Batch commit failure test
    mockRawBatch.commit = async () => {
      throw new Error('aborted: transaction conflict');
    };
    const failBatch = tracedWriteBatch(null, 'failBatch');
    failBatch.set({ path: 'users/123/chunks/c3' }, { text: 'fail' });

    await assert.rejects(
      async () => failBatch.commit(),
      /aborted: transaction conflict/
    );
    const lastLog = firestoreSessionMetrics.history[0];
    assert.equal(lastLog.status, 'error');
    assert.equal(lastLog.caller, 'failBatch');
  });
});

