import { REPO } from "../registry";
import { GitHubMark } from "./icons";

export function Header() {
  return (
    <header className="site-header">
      <a href="/" className="wordmark">
        vectoys
      </a>
      <a href={REPO} target="_blank" rel="noreferrer" className="icon-button" aria-label="GitHub">
        <GitHubMark />
      </a>
      <nav className="site-nav" aria-label="Sections">
        <a href="#gallery">Gallery</a>
        <a href="#your-registry">Registry</a>
      </nav>
    </header>
  );
}
