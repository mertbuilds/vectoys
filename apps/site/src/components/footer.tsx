import { REPO, REPO_PUBLIC } from "../registry";
import { GitHubMark, StarIcon } from "./icons";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <a href="/" className="wordmark">
          vectoys
        </a>
        <p>An open source SVG 3D engine for device mockups and small toys</p>
      </div>
      <ul className="footer-links">
        {REPO_PUBLIC && (
          <>
            <li>
              <a href={REPO} target="_blank" rel="noreferrer">
                <GitHubMark /> GitHub
              </a>
            </li>
            <li>
              <a href={REPO} target="_blank" rel="noreferrer" className="star-link">
                <StarIcon /> Give us a star
              </a>
            </li>
          </>
        )}
        <li>
          <a href="https://mertbuilds.com/?utm_source=vectoys.com&utm_medium=referral&utm_campaign=footer" target="_blank" rel="noreferrer">
            Made by Mert Düzgün
          </a>
        </li>
      </ul>
    </footer>
  );
}
