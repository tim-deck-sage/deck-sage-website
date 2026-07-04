import { type StaticImageData } from "next/image";
import { HomeImageSection } from "@/components/HomeImageSection";

type HeroSectionProps = {
  image: StaticImageData;
};

export function HeroSection({ image }: HeroSectionProps) {
  return <HomeImageSection image={image} alt="Deck Sage" priority />;
}
