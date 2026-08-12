'use strict';

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

initializeApp();

/**
 * 達成済みタスクの自動クリーンアップ
 *
 * 対象: completed=true かつ completedAt から7日以上経過したタスク
 * 除外: 未完了タスク (completed=false) は絶対に削除しない
 *
 * 毎日午前03:00 JST に実行
 */
exports.cleanupCompletedTodos = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    // 念のためタイムアウトを延長（大量データ対応）
    timeoutSeconds: 540,
    memory: '256MiB',
  },
  async (_event) => {
    const db = getFirestore();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = Timestamp.fromDate(sevenDaysAgo);

    console.log(`[cleanupCompletedTodos] 基準日時: ${sevenDaysAgo.toISOString()}`);

    // Collection Group Query で全ユーザーの todos を一括取得
    // インデックス: todos (completed ASC, completedAt ASC) [COLLECTION_GROUP]
    const snapshot = await db
      .collectionGroup('todos')
      .where('completed', '==', true)
      .where('completedAt', '<=', cutoff)
      .get();

    if (snapshot.empty) {
      console.log('[cleanupCompletedTodos] 削除対象なし');
      return;
    }

    console.log(`[cleanupCompletedTodos] 削除対象: ${snapshot.size} 件`);

    // 500件ごとにバッチ削除（Firestore上限）
    const docs = snapshot.docs;
    let totalDeleted = 0;

    for (let i = 0; i < docs.length; i += 500) {
      const chunk = docs.slice(i, i + 500);
      const batch = db.batch();
      for (const docSnap of chunk) {
        // 安全確認: completedAt が null / 未定義のドキュメントはスキップ
        const data = docSnap.data();
        if (!data.completedAt || data.completed !== true) {
          console.warn(`[cleanupCompletedTodos] スキップ: ${docSnap.ref.path}`);
          continue;
        }
        batch.delete(docSnap.ref);
      }
      await batch.commit();
      totalDeleted += chunk.length;
      console.log(`[cleanupCompletedTodos] バッチ完了: ${totalDeleted}/${docs.length}`);
    }

    console.log(`[cleanupCompletedTodos] 完了: 合計 ${totalDeleted} 件削除`);
  },
);
