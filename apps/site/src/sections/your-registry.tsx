const INDEX = `{
  "items": [
    {
      "name": "rocket",
      "title": "Rocket",
      "description": "A toy rocket"
    }
  ]
}`;

const CONFIG = `{
  "registries": {
    "@acme": "https://acme.dev/r"
  }
}`;

export function YourRegistry() {
  return (
    <section className="section split" id="your-registry" aria-labelledby="your-registry-title">
      <div className="section-copy">
        <h2 id="your-registry-title">Bring your own</h2>
        <p>
          A registry is a folder of JSON files on any static host: one file per item in the shadcn registry item format, and an index that lists
          them. Put its address in your <code className="inline">vectoys.json</code> and its items install by scope.
        </p>
        <p className="note">
          The engine, the React pieces, the CLI and the items are all MIT licensed.
        </p>
      </div>
      <div className="files">
        <figure className="file">
          <figcaption>acme.dev/r/index.json</figcaption>
          <pre>{INDEX}</pre>
        </figure>
        <figure className="file">
          <figcaption>vectoys.json</figcaption>
          <pre>{CONFIG}</pre>
        </figure>
        <figure className="file">
          <figcaption>Terminal</figcaption>
          <pre>
            <span className="command-prompt">$ </span>npx vectoys add @acme/rocket
          </pre>
        </figure>
      </div>
    </section>
  );
}
