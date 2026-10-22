import { useEffect, useState } from "react";
import { CopyCommand } from "../components/copy-command";
import { PREVIEWS } from "../items";
import { Placeholder } from "../previews/placeholder";
import { addCommand, type Entry, type RegistryIndex } from "../registry";

function Card({ item }: { item: Entry }) {
  const Preview = PREVIEWS[item.name] ?? Placeholder;
  return (
    <li className="card">
      <div className="card-preview">
        <Preview />
      </div>
      <div className="card-text">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
      <CopyCommand command={addCommand(item.name)} className="command-small" />
    </li>
  );
}

/** Every item the registry lists, read from `/r/index.json` unless the page came with it. */
export function Gallery({ index }: { index: RegistryIndex | null }) {
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

  return (
    <section className="section" id="gallery" aria-labelledby="gallery-title">
      <div className="section-copy section-copy-wide">
        <h2 id="gallery-title">Gallery</h2>
        <p>Each item copies into your project as source you own and can change. Run its command, or give the shadcn CLI its address:</p>
        <CopyCommand command="npx shadcn add https://vectoys.com/r/phone.json" className="command-wide" />
      </div>
      {items && items.length === 0 ? (
        <p className="empty">The registry could not be read. Reload the page to try again.</p>
      ) : (
        <ul className="cards">{items?.map((item) => <Card key={item.name} item={item} />)}</ul>
      )}
    </section>
  );
}
