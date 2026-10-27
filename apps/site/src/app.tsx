import { Footer } from "./components/footer";
import { Header } from "./components/header";
import type { RegistryIndex } from "./registry";
import { Faq } from "./sections/faq";
import { Hero } from "./sections/hero";
import { JustSvg } from "./sections/just-svg";
import { MakeYourOwn } from "./sections/make-your-own";
import { Uses } from "./sections/uses";

export function App({ index }: { index: RegistryIndex | null }) {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <div className="sections">
          <JustSvg />
          <Uses index={index} />
          <MakeYourOwn />
          <Faq />
        </div>
      </main>
      <Footer />
    </>
  );
}
