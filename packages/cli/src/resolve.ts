import type { Config } from "./config";

/**
 * The URL of an item's JSON: a full URL as given, `@scope/name` from the
 * registry that scope maps to, and a plain name from the default registry.
 */
export function itemUrl(spec: string, config: Config, registry = config.registry): string {
  if (/^https?:\/\//.test(spec)) return spec;
  const scoped = /^(@[^/]+)\/(.+)$/.exec(spec);
  if (scoped) return join(registryFor(scoped[1]!, config), scoped[2]!);
  if (!/^[\w.-]+$/.test(spec)) throw new Error(`"${spec}" is not an item name, an @scope/name or a URL.`);
  return join(registry, spec);
}

/** The URL of a registry's index: the default one, or the one a scope maps to. */
export function indexUrl(scope: string | undefined, config: Config, registry = config.registry): string {
  return join(scope ? registryFor(scope, config) : registry, "index");
}

function registryFor(scope: string, config: Config): string {
  const registry = config.registries[scope];
  if (!registry) {
    throw new Error(`No registry is set for ${scope}. Add it to "registries" in vectoys.json, as { "${scope}": "https://example.com/r" }.`);
  }
  return registry;
}

// A registry is a base URL items sit under as `<name>.json`, or a template
// with `{name}` in it, as shadcn's namespaced registries are written.
function join(registry: string, name: string): string {
  if (registry.includes("{name}")) return registry.replace("{name}", name);
  return `${registry.replace(/\/+$/, "")}/${name}.json`;
}
