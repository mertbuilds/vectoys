import { fixed } from "@vinena/vectoys";
import { Screen, Stage } from "@vinena/vectoys-react";
import { memo, useId, useMemo, type CSSProperties, type ReactNode } from "react";
import { BEZEL, DESK, GLASS, HOLE, ROUND, type View } from "./geometry";

// The page's colors, as CSS variables, each with the light tone of the site
// this laptop was first drawn for, so it shows as meant before they are set.
const BG = "var(--vectoys-bg, #ffffff)";
const HAIRLINE = "var(--vectoys-hairline, #8a8a8a)";
const BORDER = "var(--vectoys-border, #d4d4d4)";
const SURFACE_TONE = "var(--vectoys-surface, #f5f5f5)";
const SHADOW = "var(--vectoys-shadow, rgba(0, 0, 0, 0.08))";

// Anodised aluminium in close tones, lit from above: the tops are the page's
// surface, the sides a step darker under the page's shadow, the rim round the
// glass a step toward the border, and the shut lid an even tone. The glass,
// the hinge cover and the keyboard are near black, as on the machine, and the
// hinge's barrels a darker aluminium in the shade of the lid.
const SURFACE: CSSProperties = { fill: SURFACE_TONE };
const shade = (share: number): CSSProperties => ({ fill: SHADOW, fillOpacity: share });
const SIDE = 0.45;
const RIM_TONE = `color-mix(in srgb, ${SURFACE_TONE} 60%, ${BORDER})`;
const LENS = `color-mix(in srgb, ${HAIRLINE} 15%, black)`;
const HINGE = `color-mix(in srgb, ${HAIRLINE} 6%, black)`;
const BARREL = `color-mix(in srgb, ${SURFACE_TONE} 78%, black)`;
const WELL = `color-mix(in srgb, ${SURFACE_TONE} 10%, black)`;
const KEY = `color-mix(in srgb, ${HAIRLINE} 22%, ${WELL})`;
const TOUCH_ID = `color-mix(in srgb, ${HAIRLINE} 12%, ${WELL})`;

const hairline = (color: string): CSSProperties => ({ stroke: color, fill: "none" });
const stroke = {
  vectorEffect: "non-scaling-stroke",
  strokeWidth: 1,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

// Which field of holes shows: the full one where a hole is about a device
// pixel (a scene 560px wide at two pixels a px), the half one down to half
// that, the quarter one below. The stage is the container these ask about.
const HOLES = "vectoys-laptop-holes";
const HOLES_SHOWN = `
.${HOLES}-0, .${HOLES}-2 { display: none; }
@media (min-resolution: 2dppx) { @container (min-width: 560px) { .${HOLES}-0 { display: inline; } .${HOLES}-1 { display: none; } } }
@media (max-resolution: 1.99dppx) { @container (max-width: 559.98px) { .${HOLES}-1 { display: none; } .${HOLES}-2 { display: inline; } } }
@container (max-width: 279.98px) { .${HOLES}-1 { display: none; } .${HOLES}-2 { display: inline; } }
`;

/** The base, which never changes as the lid moves. */
const Base = memo(function Base({ id, view: { DECK } }: { id: string; view: View }) {
  return (
    <>
      <path d={DECK.ground} filter={`url(#${id}-far)`} style={shade(1)} />
      <path d={DECK.contact} filter={`url(#${id}-near)`} style={shade(1)} />
      <path d={DECK.hull} style={SURFACE} />
      <path d={DECK.hull} style={shade(SIDE)} />
      <path d={DECK.hinge} style={{ fill: HINGE }} />
      <path d={DECK.barrels} style={{ fill: BARREL }} />
      <path d={DECK.top} style={SURFACE} />
      <g clipPath={`url(#${id}-deck)`}>
        {DECK.holes.map((holes, coarser) => (
          <path
            key={coarser}
            d={holes}
            className={`${HOLES}-${coarser}`}
            strokeWidth={HOLE * 2 ** coarser}
            strokeLinecap="round"
            style={{ stroke: WELL, fill: "none" }}
          />
        ))}
      </g>
      <path d={DECK.well} style={{ fill: WELL }} />
      <path d={DECK.keys} style={{ fill: KEY }} />
      <path d={DECK.touchId} style={{ fill: TOUCH_ID }} />
      <path d={DECK.touchIdRing} {...stroke} style={hairline(KEY)} />
      <path d={DECK.trackpad} style={shade(0.2)} />
      <path d={DECK.trackpad} {...stroke} style={hairline(BORDER)} />
      <path d={DECK.scoop} style={shade(1)} />
      <path d={DECK.lines} {...stroke} style={hairline(HAIRLINE)} />
    </>
  );
});

/** What the drawing refers to, under names of its own so any number of laptops share a page. */
const defs = (id: string, { width, height }: View["camera"]) => (
  <>
    <style>{HOLES_SHOWN}</style>
    <filter id={`${id}-near`} filterUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
      <feGaussianBlur stdDeviation="0.4 0.2" />
    </filter>
    <filter id={`${id}-far`} filterUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
      <feGaussianBlur stdDeviation="2 0.9" />
    </filter>
    <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" style={{ stopColor: `color-mix(in srgb, ${SURFACE_TONE} 70%, ${BG})` }} />
      <stop offset="1" style={{ stopColor: SURFACE_TONE }} />
    </linearGradient>
  </>
);

// The glass's top corners follow the lid's, inside the bezel, as shares of
// the glass so they hold at any size the content lays out at.
const CORNER = ROUND - BEZEL;
const ACROSS = `${fixed((CORNER / GLASS.width) * 100)}%`;
const DOWN = `${fixed((CORNER / GLASS.height) * 100)}%`;
const GLASS_STYLE: CSSProperties = {
  overflow: "hidden",
  background: "#0d0d0d",
  borderRadius: `${ACROSS} ${ACROSS} 0 0 / ${DOWN} ${DOWN} 0 0`,
  clipPath: `inset(0 round ${ACROSS} ${ACROSS} 0 0 / ${DOWN} ${DOWN} 0 0)`,
  containerType: "inline-size",
};
const FILL: CSSProperties = { position: "absolute", inset: 0 };

type LaptopProps = {
  /** How far the lid has closed, from 0 (open) to 1 (shut on the base); open by default. */
  closed?: number;
  /** The eye that sees it: `DESK`, `PHONE` or `FRONT`; `DESK` by default. */
  eye?: View;
  /** The laptop's name for assistive technology. */
  label?: string;
  /** Live content on the display, laid out as on a screen about 1280 pixels wide. */
  children?: ReactNode;
};

/**
 * A 14 inch laptop seen from the eye you pass (DESK, PHONE or FRONT): one SVG
 * drawn from the laptop's projected outline, and the display's glass laid onto the lid with
 * live content on it, hidden while the lid faces away.
 */
export const Laptop = memo(function Laptop({ closed = 0, eye = DESK, children, label = "Laptop" }: LaptopProps) {
  const id = `laptop-${eye.id}-${useId().replace(/[^\w-]/g, "")}`;
  const { DECK, camera } = eye;
  const lid = useMemo(() => eye.lidArt(closed), [eye, closed]);

  const glass = (
    <Screen camera={camera} pose={eye.lidWorld(closed)} rect={GLASS} style={GLASS_STYLE}>
      <div style={{ ...FILL, background: `linear-gradient(110deg, color-mix(in srgb, ${HAIRLINE} 9%, transparent), transparent 35%)` }} />
      <div style={FILL}>{children}</div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "12.5%",
          height: "3.6%",
          transform: "translateX(-50%)",
          borderRadius: "0 0 0.8cqw 0.8cqw",
          background: "black",
        }}
      >
        <div style={{ width: "0.7cqw", height: "0.7cqw", borderRadius: "50%", background: LENS }} />
      </div>
    </Screen>
  );

  // Empty, the device is a picture; with live content it is a group, so its
  // links and buttons stay reachable inside it.
  return (
    <Stage role={children == null ? "img" : "group"} label={label} camera={camera} overlay={glass}>
      <defs>
        {defs(id, camera)}
        <clipPath id={`${id}-deck`}>
          <path d={DECK.top} />
        </clipPath>
        {lid.shadow && (
          <linearGradient id={`${id}-lid-shadow`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={lid.shadow.from} y2={lid.shadow.to}>
            <stop offset="0" style={{ stopColor: SHADOW }} />
            <stop offset="1" style={{ stopColor: SHADOW, stopOpacity: 0 }} />
          </linearGradient>
        )}
        {/*
          A mask and not a clip path: the three shapes are painted one over the other, so which way round each
          outline runs does not matter. As two paths of one clip path the lid went missing for single frames of
          its swing, at the angles where the outline that clears it happened to run the other way.
        */}
        {lid.cut && (
          <mask id={`${id}-lid-cut`} maskUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="170">
            <rect x="-50" y="-50" width="200" height="170" fill="white" />
            <path d={lid.cut.hidden} fill="black" />
            <path d={lid.cut.clear} fill="white" />
          </mask>
        )}
      </defs>
      <Base id={id} view={eye} />
      {lid.shadow && <path d={DECK.top} fill={`url(#${id}-lid-shadow)`} opacity={fixed(closed)} />}
      <g mask={lid.cut ? `url(#${id}-lid-cut)` : undefined}>
        <path d={lid.hull} style={SURFACE} />
        <path d={lid.hull} style={shade(SIDE)} />
        {lid.facing ? (
          <>
            <path d={lid.face} style={{ fill: RIM_TONE }} />
            {lid.bezel && <path d={lid.bezel} fill="black" />}
          </>
        ) : (
          <path d={lid.face} fill={`url(#${id}-sheen)`} />
        )}
        <path d={lid.lines} {...stroke} style={hairline(HAIRLINE)} />
      </g>
    </Stage>
  );
});
