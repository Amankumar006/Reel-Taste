import Image from 'next/image';
import { TMDB_IMAGE_BASE } from '@/app/data/movies';

interface MoviePosterProps {
  title: string;
  posterPath?: string | null;
  className?: string;
}

// Shows the real TMDB poster when available; falls back to a typographic gradient.
export default function MoviePoster({ title, posterPath, className = '' }: MoviePosterProps) {
  if (posterPath) {
    return (
      <div className={`relative overflow-hidden bg-gray-900 ${className}`}>
        <Image
          src={`${TMDB_IMAGE_BASE}${posterPath}`}
          alt={`${title} poster`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
    );
  }

  // Fallback: typographic gradient
  const initials = title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={`relative flex items-end overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900 ${className}`}
    >
      <span className="pointer-events-none absolute -right-2 -top-3 text-7xl font-semibold text-white/15 tracking-tight">
        {initials}
      </span>
      <span className="relative p-3 text-sm font-semibold leading-tight text-white drop-shadow-sm">
        {title}
      </span>
    </div>
  );
}
