const QUESTIONS = [
  {
    question: "Why not Three.js, Spline or a PNG mockup?",
    answer:
      "It needs no WebGL or images: the device is plain SVG drawn on the server, so it shows before any script runs, and its screen is HTML you can select.",
  },
  {
    question: "Is it free?",
    answer: "Yes. The engine, the React pieces, the CLI and every item are MIT licensed. Items copy into your project as source you own.",
  },
  {
    question: "Does it work without React?",
    answer:
      "Not yet. The items need React 19 or later. The engine underneath has no dependencies, but nothing ships for Vue, Svelte or plain HTML today.",
  },
  {
    question: "Is it heavy on a phone?",
    answer: "No. This whole page's HTML is 19 kilobytes gzipped, and the turning phone above kept 60 frames a second in Chrome with the processor slowed six times.",
  },
  {
    question: "Can screen readers use it?",
    answer:
      "Yes. Each device has a label, toys are real buttons and links, the screen's HTML is read like the rest of the page, and motion stops with reduced motion on.",
  },
];

export function Faq() {
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="section-copy section-copy-wide">
        <h2 id="faq-title">Questions</h2>
      </div>
      <dl className="faq">
        {QUESTIONS.map(({ question, answer }) => (
          <div key={question}>
            <dt>{question}</dt>
            <dd>{answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
