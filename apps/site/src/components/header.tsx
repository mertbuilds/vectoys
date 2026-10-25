import { REPO, REPO_PUBLIC } from "../registry";
import { GitHubMark } from "./icons";

export function Header() {
  return (
    <header className="site-header">
      <a href="/" className="wordmark">
        vectoys
      </a>
      <nav className="site-nav" aria-label="Sections">
        <a href="#gallery">Gallery</a>
        <a href="#your-registry">Registry</a>
      </nav>
      {REPO_PUBLIC && (
        <a href={REPO} target="_blank" rel="noreferrer" className="icon-button" aria-label="GitHub">
          <GitHubMark />
        </a>
      )}
    </header>
  );
}
