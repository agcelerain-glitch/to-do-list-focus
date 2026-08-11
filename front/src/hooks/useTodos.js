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

  const add = (title, content) =>
    addDoc(collection(db, 'users', userId, 'todos'), {
      title,
      content,
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

  const update = (id, title, content) =>
    updateDoc(doc(db, 'users', userId, 'todos', id), {
      title,
      content,
      createdAt: serverTimestamp(),
    })

  const remove = id =>
    deleteDoc(doc(db, 'users', userId, 'todos', id))

  return { todos, add, complete, revive, update, remove }
}
