import Image from "next/image";
import pageHeroImage from "@/public/images/backgrounds/page_hero.png";

export function PageHero() {
  return (
    <section className="page-hero" aria-label="Page header">
      <Image
        className="artwork-image page-hero-image"
        src={pageHeroImage}
        alt=""
        priority
        sizes="100vw"
        draggable={false}
      />
    </section>
  );
}
