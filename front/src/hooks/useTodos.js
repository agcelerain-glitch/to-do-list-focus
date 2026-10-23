import { useState, useEffect } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export function useTodos(userId) {
  const [todos, setTodos] = useState([])

  useEffect(() => {
    if (!userId) return
    const q = query(collection(db, 'users', userId, 'todos'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [userId])

  const add = (title, content, priority = null) =>
    addDoc(collection(db, 'users', userId, 'todos'), {
      title,
      content,
      priority,
      completed: false,
      createdAt: serverTimestamp(),
      completedAt: null,
    })

  const complete = id =>
    updateDoc(doc(db, 'users', userId, 'todos', id), {
      completed: true,
      completedAt: serverTimestamp(),
    })

  const revive = id =>
    updateDoc(doc(db, 'users', userId, 'todos', id), {
      completed: false,
      completedAt: null,
    })

  const update = (id, title, content, priority = null) =>
    updateDoc(doc(db, 'users', userId, 'todos', id), {
      title,
      content,
      priority,
      createdAt: serverTimestamp(),
    })

  // 優先度だけを即時更新する（title/content/createdAt は触らない）。
  // 詳細モーダルからのワンタップ変更用。null で無印に戻す。
  const setPriority = (id, priority) =>
    updateDoc(doc(db, 'users', userId, 'todos', id), { priority })

  const remove = id => deleteDoc(doc(db, 'users', userId, 'todos', id))

  // 達成済みのタスクをまとめて削除する。writeBatch で 1 コミットにまとめる。
  // Firestore のバッチ上限は 500 件なので、超える場合は分割してコミットする。
  const removeCompleted = async () => {
    const targets = todos.filter(todo => todo.completed)
    if (targets.length === 0) return
    for (let i = 0; i < targets.length; i += 500) {
      const batch = writeBatch(db)
      targets.slice(i, i + 500).forEach(todo => {
        batch.delete(doc(db, 'users', userId, 'todos', todo.id))
      })
      await batch.commit()
    }
  }

  return { todos, add, complete, revive, update, setPriority, remove, removeCompleted }
}
