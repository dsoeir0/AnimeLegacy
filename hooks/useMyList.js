import { useEffect, useState } from 'react'

const STORAGE_KEY = 'animeLegacy.myList'

const readStoredList = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

export default function useMyList() {
  const [list, setList] = useState([])
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    setList(readStoredList())
    setHasLoaded(true)
  }, [])

  useEffect(() => {
    if (!hasLoaded || typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }, [list, hasLoaded])

  const addItem = (item) => {
    if (!item?.id) return
    setList((prev) => {
      if (prev.some((entry) => entry.id === item.id)) return prev
      return [item, ...prev]
    })
  }

  const removeItem = (id) => {
    setList((prev) => prev.filter((entry) => entry.id !== id))
  }

  const isInList = (id) => list.some((entry) => entry.id === id)

  return { list, addItem, removeItem, isInList, hasLoaded }
}

