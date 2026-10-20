// 優先度の単一情報源（キー・並び順・アイコン）
// 色は index.css の --prio-* 変数で定義し、色覚特性モードごとに上書きする。
// ここではキー・並び順・形（アイコン）のみを管理する。

export const PRIORITIES = ['high', 'mid', 'low']

// 並び替えランク（小さいほど上位）。未設定(null/undefined)は最下部。
const PRIORITY_RANK = { high: 0, mid: 1, low: 2 }

export function priorityRank(p) {
  return PRIORITY_RANK[p] ?? 3
}

// Font Awesome 6 アイコン。向き/形で高中低を区別（色に依存しない）。
export const PRIORITY_ICON = {
  high: 'fa-angles-up', // 二重上矢印
  mid: 'fa-minus', // 横棒
  low: 'fa-angles-down', // 二重下矢印
}
