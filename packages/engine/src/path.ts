import type { Flat } from "./vector";

/**
 * A computed number cut to 4 decimals, and -0 to 0, so markup reads the same
 * from the server's HTML as from the client.
 */
export const fixed = (value: number) => Math.round(value * 1e4) / 1e4 || 0;

// Path data is cut finer than a device pixel needs, to keep the markup short.
const cut = (value: number) => Math.round(value * 100) / 100 || 0;

/** An open run of points as SVG path data. */
export const line = (points: readonly Flat[]) => `M${points.map(([x, y]) => `${cut(x)} ${cut(y)}`).join("L")}`;

/** A closed outline as SVG path data. */
export const shape = (points: readonly Flat[]) => `${line(points)}Z`;
