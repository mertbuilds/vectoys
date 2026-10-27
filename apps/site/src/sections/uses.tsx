import { Floppy } from "@vectoys/floppy";
import { Gift } from "@vectoys/gift";
import { KeycapRow } from "@vectoys/keycap";
import { Phone } from "@vectoys/phone";
import { Watch } from "@vectoys/watch";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CopyCommand } from "../components/copy-command";
import { addCommand, type RegistryIndex } from "../registry";

/** A calm screen for the previews. */
const Wallpaper = () => <div className="wallpaper" />;

type Use = { title: string; body: string; command: string; preview: () => ReactNode };

const USES: Use[] = [
  {
    title: "An app launch with a phone and a watch",
    body: "Put your app's real screens on both. They stay sharp at any size.",
    command: addCommand("phone watch"),
    preview: () => (
      <div className="preview-duo">
        <div className="preview-duo-phone">
          <Phone yaw={22} pitch={-12}>
            <Wallpaper />
          </Phone>
        </div>
        <div className="preview-duo-watch">
          <Watch yaw={-26} pitch={-14}>
            <Wallpaper />
          </Watch>
        </div>
      </div>
    ),
  },
  {
    title: "A pricing page with a gift that pops a coupon",
    body: "Click the box: the lid pops off and the code rises out.",
    command: addCommand("gift"),
    preview: () => (
      <div className="preview-gift">
        <Gift>
          <div className="coupon">TOYS10</div>
        </Gift>
      </div>
    ),
  },
  {
    title: "A download button on a floppy",
    body: "A real link or button. The shutter slides when you press it.",
    command: addCommand("floppy"),
    preview: () => (
      <div className="preview-floppy">
        <Floppy label="Download the press kit">press-kit.zip</Floppy>
      </div>
    ),
  },
  {
    title: "Your shortcut spelled in keycaps",
    body: "Each key is a real button you can press.",
    command: addCommand("keycap"),
    preview: () => (
      <div className="preview-keys">
        <KeycapRow keys={["⌘", "K"]} label="Command K" />
      </div>
    ),
  },
];

/** A preview drawn only once it comes near the screen, so the page's HTML stays small. */
function LazyPreview({ children }: { children: () => ReactNode }) {
  const well = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const element = well.current;
    if (!element || shown) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setShown(true);
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [shown]);
  return (
    <div className="use-preview" ref={well}>
      {shown && children()}
    </div>
  );
}

/** The real uses, then every item the registry lists, read from `/r/index.json` unless the page came with it. */
export function Uses({ index }: { index: RegistryIndex | null }) {
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
        <h2 id="gallery-title">What you can build</h2>
        <p>Each item copies into your project as source you own and can change.</p>
      </div>
      <ul className="uses">
        {USES.map((use) => (
          <li key={use.title} className="use">
            <LazyPreview>{use.preview}</LazyPreview>
            <div className="use-text">
              <h3>{use.title}</h3>
              <p>{use.body}</p>
            </div>
            <CopyCommand command={use.command} className="command-in-card" />
          </li>
        ))}
      </ul>
      <div className="registry" id="registry">
        <p>
          {items && items.length > 0
            ? `All ${items.length} items: ${items.map((item) => item.title).join(", ")}. `
            : "Every item is in the registry. "}
          Each one is a JSON file in the shadcn registry format at vectoys.com/r, so the shadcn CLI installs it too:
        </p>
        <CopyCommand command="npx shadcn add https://vectoys.com/r/phone.json" className="command-wide" />
      </div>
    </section>
  );
}
