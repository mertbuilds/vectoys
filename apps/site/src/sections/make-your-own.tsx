import { CopyCommand, CopyPrompt } from "../components/copy-command";

const PROMPT = "Run npx vectoys skill and follow it. Make me a spinning top for my landing page, check it, preview it, then submit it.";

const STEPS = [
  { name: "Create", what: "a folder with a working item to draw in", command: "npx vectoys create top" },
  { name: "Check", what: "renders on the server, no brand names, under 64 KB", command: "npx vectoys check top" },
  { name: "Preview", what: "light and dark, turned to a row of angles", command: "npx vectoys preview top" },
  { name: "Submit", what: "a pull request that adds it to the registry", command: "npx vectoys submit top" },
];

export function MakeYourOwn() {
  return (
    <section className="section split" id="make-your-own" aria-labelledby="make-your-own-title">
      <div className="section-copy">
        <h2 id="make-your-own-title">Make your own with your agent</h2>
        <p>The CLI comes with a skill that teaches a coding agent how items are built. Give it this prompt and name the thing you want.</p>
        <p className="note">
          Submissions open at launch. If you host your own registry, <code className="inline">vectoys submit --registry</code> lists it here.
        </p>
      </div>
      <div className="agent-flow">
        <CopyPrompt prompt={PROMPT} caption="Prompt for your agent" />
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.name}>
              <p>
                {step.name} <span>{step.what}</span>
              </p>
              <CopyCommand command={step.command} className="command-small" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
