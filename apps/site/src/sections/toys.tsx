import { CopyCommand } from "../components/copy-command";
import { LazyPreview } from "../components/lazy-preview";
import { PREVIEWS } from "../items";
import { Placeholder } from "../previews/placeholder";
import { REPO, addCommand, type Entry, type RegistryIndex } from "../registry";
import { useItems } from "../use-items";

function Toy({ item }: { item: Entry }) {
  const Preview = PREVIEWS[item.name] ?? Placeholder;
  return (
    <li className="toy" id={item.name}>
      <LazyPreview className="toy-preview">{() => <Preview />}</LazyPreview>
      <div className="use-text">
        <h2>{item.title}</h2>
        <p>{item.description}</p>
      </div>
      <CopyCommand command={addCommand(item.name)} className="command-in-card" />
      <a className="toy-source" href={`${REPO}/tree/main/registry/${item.name}`} target="_blank" rel="noreferrer">
        Source on GitHub
      </a>
    </li>
  );
}

/** The /toys page: every item the registry lists, live, with its install command and its source. */
export function Toys({ index }: { index: RegistryIndex | null }) {
  const items = useItems(index);
  return (
    <>
      <section className="hero" aria-labelledby="toys-title">
        <div className="toys-intro">
          <h1 id="toys-title">All toys</h1>
          <p className="lede">
            {items && items.length > 0 ? `${items.length} devices and toys` : "Every device and toy"}, each one live. Copy one into your React
            project with its command, then change it as you like.
          </p>
        </div>
      </section>
      <div className="sections">
        {items && items.length === 0 ? (
          <p className="empty">The registry could not be read. Reload the page to try again.</p>
        ) : (
          <ul className="toys">{items?.map((item) => <Toy key={item.name} item={item} />)}</ul>
        )}
      </div>
    </>
  );
}
