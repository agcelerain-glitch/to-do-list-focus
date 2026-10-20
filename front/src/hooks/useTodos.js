import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export function useTodos(userId) {
  const [todos, setTodos] = useState([])

  useEffect(() => {
    if (!userId) return
    const q = query(
      collection(db, 'users', userId, 'todos'),
      orderBy('createdAt', 'desc'),
    )
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

  const remove = id =>
    deleteDoc(doc(db, 'users', userId, 'todos', id))

  return { todos, add, complete, revive, update, setPriority, remove }
}
