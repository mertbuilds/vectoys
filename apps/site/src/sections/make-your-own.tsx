import { CopyPrompt } from "../components/copy-command";

const PROMPT = "Run npx vectoys skill and follow it. Make me a spinning top for my landing page, check it, preview it, then submit it.";

export function MakeYourOwn() {
  return (
    <section className="section split" id="make-your-own" aria-labelledby="make-your-own-title">
      <div className="section-copy">
        <h2 id="make-your-own-title">Make your own with your agent</h2>
        <p>The CLI comes with a skill that teaches a coding agent how items are built. Give it this prompt and it creates, checks, previews and submits the item for you.</p>
        <p className="note">
          Submissions open at launch. If you host your own registry, <code className="inline">vectoys submit --registry</code> lists it here.
        </p>
      </div>
      <CopyPrompt prompt={PROMPT} caption="Prompt for your agent" />
    </section>
  );
}
