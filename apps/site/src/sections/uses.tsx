import { Floppy } from "@vectoys/floppy";
import { Gift } from "@vectoys/gift";
import { KeycapRow } from "@vectoys/keycap";
import { Phone } from "@vectoys/phone";
import { Watch } from "@vectoys/watch";
import type { ReactNode } from "react";
import { CopyCommand } from "../components/copy-command";
import { LazyPreview } from "../components/lazy-preview";
import { addCommand, type RegistryIndex } from "../registry";
import { useItems } from "../use-items";

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

/** The real uses, a link to every toy, then the registry line with every item the registry lists. */
export function Uses({ index }: { index: RegistryIndex | null }) {
  const items = useItems(index);

  return (
    <section className="section" id="gallery" aria-labelledby="gallery-title">
      <div className="section-copy section-copy-wide">
        <h2 id="gallery-title">What you can build</h2>
        <p>Each item copies into your project as source you own and can change.</p>
      </div>
      <ul className="uses">
        {USES.map((use) => (
          <li key={use.title} className="use">
            <LazyPreview className="use-preview">{use.preview}</LazyPreview>
            <div className="use-text">
              <h3>{use.title}</h3>
              <p>{use.body}</p>
            </div>
            <CopyCommand command={use.command} className="command-in-card" />
          </li>
        ))}
      </ul>
      <a href="/toys" className="button-filled">
        Show all toys
      </a>
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
