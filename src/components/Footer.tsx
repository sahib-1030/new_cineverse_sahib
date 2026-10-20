import React from 'react';
import Link from 'next/link';
import { Database, ShieldCheck, Cpu, Code2, Server, Film } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-900 bg-black mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-gray-400">
          
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gray-800 flex items-center justify-center text-white">
                <Film className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white">
                CINE<span className="text-white">VERSE</span>
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">
              A high-performance social movie discovery & review platform built for Database Management Systems coursework.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              PostgreSQL 16 Relational Engine Active
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-3">
              DBMS Concepts Showcase
            </h4>
            <ul className="space-y-1.5 text-[11px] text-gray-500">
              <li>• 3NF Normalized Schema (12 Tables)</li>
              <li>• PL/pgSQL Triggers (Rating sync & audit)</li>
              <li>• Stored Procedures & Functions</li>
              <li>• Window Functions (`DENSE_RANK()`)</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-3">
              Platform Views
            </h4>
            <ul className="space-y-1.5 text-[11px] text-gray-500">
              <li><Link href="/" className="hover:text-white transition-colors">Trending Discover Hub</Link></li>
              <li><Link href="/feed" className="hover:text-white transition-colors">Social Activity Feed</Link></li>
              <li><Link href="/lists" className="hover:text-white transition-colors">Curated Watchlists</Link></li>
              <li><Link href="/dbms-console" className="hover:text-white transition-colors">DBMS Console</Link></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-3">
              Evaluation & Viva Tools
            </h4>
            <p className="text-[11px] text-gray-500 mb-3">
              Access the interactive SQL runner, trigger test suite, and schema introspection.
            </p>
            <Link
              href="/dbms-console"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold border border-gray-800 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-gray-400" /> Open DBMS Console
            </Link>
          </div>

        </div>

        <div className="mt-10 pt-6 border-t border-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-gray-500">
          <div>CineVerse DBMS Academic Project • Next.js & PostgreSQL</div>
          <div className="font-mono text-gray-400">100% Relational SQL Engine</div>
        </div>
      </div>
    </footer>
  );
}
