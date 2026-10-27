import { REPO, REPO_PUBLIC } from "../registry";
import { GitHubMark } from "./icons";

export function Header() {
  return (
    <header className="site-header">
      <a href="/" className="wordmark">
        vectoys
      </a>
      <nav className="site-nav" aria-label="Sections">
        <a href="/toys">Gallery</a>
        <a href="/#registry" className="nav-registry">
          Registry
        </a>
        <a href="/#showcase">Showcase</a>
      </nav>
      {REPO_PUBLIC && (
        <a href={REPO} target="_blank" rel="noreferrer" className="github-button">
          <GitHubMark /> <span className="github-label">GitHub</span>
        </a>
      )}
    </header>
  );
}
