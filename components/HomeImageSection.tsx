import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

type HomeImageSectionProps = {
  image: StaticImageData;
  alt: string;
  priority?: boolean;
  showFooterLinks?: boolean;
};

export function HomeImageSection({
  image,
  alt,
  priority = false,
  showFooterLinks = false
}: HomeImageSectionProps) {
  return (
    <section className="artwork-section home-artwork-section">
      <Image
        className="artwork-image"
        src={image}
        alt={alt}
        priority={priority}
        sizes="100vw"
        unoptimized
        draggable={false}
      />
      {showFooterLinks && (
        <div className="home-footer-hotspots" aria-label="Footer links">
          <Link
            className="home-footer-hotspot home-footer-hotspot-support"
            href="/support"
            aria-label="Support"
          />
          <Link
            className="home-footer-hotspot home-footer-hotspot-privacy"
            href="/privacy-policy"
            aria-label="Privacy Policy"
          />
          <Link
            className="home-footer-hotspot home-footer-hotspot-terms"
            href="/terms-of-use"
            aria-label="Terms of Use"
          />
        </div>
      )}
    </section>
  );
}
