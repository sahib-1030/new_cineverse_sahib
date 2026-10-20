'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, Film } from 'lucide-react';
import { Movie } from '@/lib/types';

interface MovieCardProps {
  movie: Movie;
  priority?: boolean;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const [imgSrc, setImgSrc] = useState(movie.poster_url);
  const [hasError, setHasError] = useState(false);

  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const rating = Number(movie.avg_rating || 0);

  return (
    <Link
      href={`/movies/${movie.movie_id}`}
      className="group flex flex-col space-y-1.5 select-none"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0d121b] rounded-xl border border-[#7f7360]/25 shadow-md group-hover:border-[#ff6b57]/40 transition-all duration-300">
        {!hasError && imgSrc ? (
          <img
            src={imgSrc}
            alt={movie.title}
            onError={() => {
              setHasError(true);
            }}
            className="w-full h-full object-cover filter brightness-95 group-hover:scale-105 group-hover:brightness-105 transition-all duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-[#718096] bg-[#0d121b]">
            <Film className="w-6 h-6 mb-1.5 opacity-40" />
            <span className="text-[11px] font-semibold line-clamp-2 text-[#9aa7b9]">{movie.title}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300 pointer-events-none" />
      </div>

      {/* Metadata Underneath */}
      <div className="flex items-center justify-between gap-1 text-[11px] px-0.5">
        <strong className="font-semibold text-[#f7f8fb] group-hover:text-white truncate max-w-[80%]">
          {movie.title}
        </strong>
        {rating > 0 ? (
          <span className="font-semibold text-[#ff6b57] shrink-0">
            {rating.toFixed(1)}
          </span>
        ) : (
          <span className="text-[#8d99aa] shrink-0">—</span>
        )}
      </div>
    </Link>
  );
}
