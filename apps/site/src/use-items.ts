import { useEffect, useState } from "react";
import type { Entry, RegistryIndex } from "./registry";

/** Every item the registry lists: from the page when it was drawn with them, else read from `/r/index.json`. Empty when that fails. */
export function useItems(index: RegistryIndex | null): Entry[] | null {
  const [items, setItems] = useState(index?.items ?? null);
  useEffect(() => {
    if (items) return;
    let current = true;
    fetch("/r/index.json")
      .then((response) => response.json())
      .then((loaded: RegistryIndex) => current && setItems(loaded.items))
      .catch(() => current && setItems([]));
    return () => {
      current = false;
    };
  }, [items]);
  return items;
}
