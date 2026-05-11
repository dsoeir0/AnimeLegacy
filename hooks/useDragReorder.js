import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function useDragReorder({ items, getId, onReorder }) {
  const [order, setOrder] = useState(() => items.map(getId));
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const lastCommitted = useRef(order.join('|'));

  useEffect(() => {
    const incoming = items.map(getId);
    const incomingKey = incoming.join('|');
    if (incomingKey === lastCommitted.current) return;
    setOrder(incoming);
    lastCommitted.current = incomingKey;
  }, [items, getId]);

  const sorted = useMemo(() => {
    const indexById = new Map();
    items.forEach((item) => indexById.set(getId(item), item));
    return order.map((id) => indexById.get(id)).filter(Boolean);
  }, [items, order, getId]);

  const commit = useCallback(
    (next) => {
      const key = next.join('|');
      if (key === lastCommitted.current) return;
      lastCommitted.current = key;
      setOrder(next);
      if (typeof onReorder === 'function') onReorder(next);
    },
    [onReorder],
  );

  const onDragStart = (id) => (event) => {
    setDragId(id);
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try {
        event.dataTransfer.setData('text/plain', String(id));
      } catch {}
    }
  };

  const onDragOver = (id) => (event) => {
    event.preventDefault();
    if (event?.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (dragId && id !== dragId) setOverId(id);
  };

  const onDrop = (id) => (event) => {
    event.preventDefault();
    if (!dragId || id === dragId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const next = order.filter((x) => x !== dragId);
    const targetIdx = next.indexOf(id);
    next.splice(targetIdx, 0, dragId);
    setDragId(null);
    setOverId(null);
    commit(next);
  };

  const onDragEnd = () => {
    setDragId(null);
    setOverId(null);
  };

  const move = useCallback(
    (id, delta) => {
      const idx = order.indexOf(id);
      if (idx === -1) return;
      const target = idx + delta;
      if (target < 0 || target >= order.length) return;
      const next = order.slice();
      const [removed] = next.splice(idx, 1);
      next.splice(target, 0, removed);
      commit(next);
    },
    [order, commit],
  );

  return {
    sorted,
    dragId,
    overId,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    move,
  };
}
