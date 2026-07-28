import Image from 'next/image';

export default function HeroImage() {
  return (
    <div className="relative w-full h-56 sm:h-80 bg-gray-100">
      <Image
        src="/images/anniversary-hero.jpg"
        alt="Breakfast table set on the Idan Barn terrace, overlooking the Mt Kenya countryside"
        fill
        sizes="(max-width: 640px) 100vw, 860px"
        className="object-cover"
        priority
      />
    </div>
  );
}
