import { HeroSection } from "@/components/HeroSection";
import { HomeImageSection } from "@/components/HomeImageSection";
import heroImage from "@/public/images/hero/hero.png";
import bottomImage from "@/public/images/sections/bottom.png";
import middleImage from "@/public/images/sections/Middle.png";

export default function Home() {
  return (
    <>
      <HeroSection image={heroImage} />
      <HomeImageSection image={middleImage} alt="" />
      <HomeImageSection image={bottomImage} alt="" showFooterLinks />
    </>
  );
}
