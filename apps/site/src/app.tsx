import { Footer } from "./components/footer";
import { Header } from "./components/header";
import type { RegistryIndex } from "./registry";
import { Gallery } from "./sections/gallery";
import { Hero } from "./sections/hero";
import { JustSvg } from "./sections/just-svg";
import { LiveScreen } from "./sections/live-screen";
import { YourRegistry } from "./sections/your-registry";

export function App({ index }: { index: RegistryIndex | null }) {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <JustSvg />
        <LiveScreen />
        <Gallery index={index} />
        <YourRegistry />
      </main>
      <Footer />
    </>
  );
}
