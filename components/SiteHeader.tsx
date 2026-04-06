import Image from 'next/image';
import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="border-b border-border pb-4 mb-8">
      <nav aria-label="Main navigation" className="flex items-center gap-6">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Accidental Recipes"
            width={166}
            height={45}
            priority
          />
        </Link>
        <ul className="flex gap-4 text-sm" role="list">
          <li>
            <Link href="/" className="link-secondary">
              Recipes
            </Link>
          </li>
          <li>
            <Link href="/ingredients" className="link-secondary">
              Ingredients
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
