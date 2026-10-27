import { useId, useState } from "react";
import { track } from "../analytics";

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

/** The questions as schema.org FAQPage data, so search engines read the answers as they are on the page. */
const STRUCTURED = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: QUESTIONS.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
}).replace(/</g, "\\u003c");

/** One question: a button in a heading opens its answer. The answer is in the HTML either way, and out of reach while closed. */
function Question({ question, answer }: { question: string; answer: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const questionId = `${id}-question`;
  const answerId = `${id}-answer`;
  return (
    <div className="faq-item">
      <h3>
        <button
          type="button"
          id={questionId}
          className="faq-button"
          aria-expanded={open}
          aria-controls={answerId}
          onClick={() => {
            if (!open) track("faq_open", { question });
            setOpen(!open);
          }}
        >
          <span>{question}</span>
          <svg className="faq-chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h3>
      <div id={answerId} role="region" aria-labelledby={questionId} className="faq-answer" data-open={open} inert={!open}>
        <div className="faq-clip">
          <p>{answer}</p>
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="section-copy section-copy-wide faq-head">
        <h2 id="faq-title">Questions</h2>
      </div>
      <div className="faq">
        {QUESTIONS.map(({ question, answer }) => (
          <Question key={question} question={question} answer={answer} />
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: STRUCTURED }} />
    </section>
  );
}
