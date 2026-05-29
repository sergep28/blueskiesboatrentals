import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Tag, ArrowRight, Instagram, Facebook } from 'lucide-react';
import { trpc } from '../lib/trpc';

const categories = [
  { key: 'all', label: 'All Posts' },
  { key: 'fishing_report', label: 'Fishing Reports' },
  { key: 'keys_guide', label: 'Keys Guides' },
  { key: 'experiences', label: 'Experiences' },
  { key: 'behind_the_scenes', label: 'Behind the Scenes' },
];

const categoryLabels: Record<string, string> = {
  fishing_report: 'Fishing Report',
  keys_guide: 'Keys Guide',
  experiences: 'Experience',
  behind_the_scenes: 'Behind the Scenes',
  general: 'General',
};

// Social links - update these with your real handles
const socials = {
  instagram: 'https://www.instagram.com/blueskiescharter/',
  tiktok: 'https://tiktok.com/@blueskiescharter',
  facebook: 'https://facebook.com/blueskiescharter',
};

export default function BlogPage() {
  useEffect(() => { document.title = 'Florida Keys Boating Blog — Fishing Reports & Guides | Blue Skies Boat Rentals'; }, []);
  const [activeCategory, setActiveCategory] = useState('all');
  const { data: posts } = trpc.blog.list.useQuery(
    activeCategory === 'all' ? undefined : { category: activeCategory }
  );

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <span className="text-white/80 font-semibold text-sm uppercase tracking-wider">The Log</span>
              <h1 className="font-heading text-4xl md:text-5xl font-normal mt-2">
                Stories from the Water
              </h1>
              <p className="text-white/80 mt-3 max-w-xl">
                Fishing reports, Keys guides, behind-the-scenes looks at the fleet, and everything happening
                from Key Largo to Marathon. Follow along.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm mr-2">Follow us:</span>
              <a href={socials.instagram} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 flex items-center justify-center transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href={socials.tiktok} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-sky-700 flex items-center justify-center transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.65a8.35 8.35 0 004.76 1.49V6.69h-1z"/>
                </svg>
              </a>
              <a href={socials.facebook} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-blue-600 flex items-center justify-center transition-all">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.key
                  ? 'bg-sky-500 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(posts as any[])?.map((post: any, i: number) => (
            <motion.article
              key={post.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl shadow-md overflow-hidden group hover:shadow-xl transition-shadow"
            >
              <Link to={`/blog/${post.slug}`}>
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={post.coverImage ?? '/boat-alligator-reef.jpeg'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-slate-900/80 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full font-medium">
                      {categoryLabels[post.category] ?? post.category}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span>{post.author}</span>
                </div>
                <Link to={`/blog/${post.slug}`}>
                  <h2 className="font-heading text-xl font-normal text-slate-900 mb-2 group-hover:text-sky-600 transition-colors">
                    {post.title}
                  </h2>
                </Link>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{post.excerpt}</p>

                {/* Social links for this post */}
                <div className="flex items-center justify-between">
                  <Link
                    to={`/blog/${post.slug}`}
                    className="flex items-center gap-1 text-sky-600 font-semibold text-sm hover:text-sky-700"
                  >
                    Read More <ArrowRight className="w-4 h-4" />
                  </Link>
                  <div className="flex gap-2">
                    {post.instagramUrl && (
                      <a href={post.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-500">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {post.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100">
                    {JSON.parse(post.tags).map((tag: string) => (
                      <span key={tag} className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.article>
          ))}
        </div>

        {(!posts || (posts as any[]).length === 0) && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No posts in this category yet.</p>
          </div>
        )}

        {/* Instagram Feed */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <p className="text-sky-500 text-xs font-semibold tracking-[0.2em] uppercase mb-2">Follow Along</p>
            <h2 className="font-heading text-3xl text-slate-900">Latest from Instagram</h2>
            <p className="text-slate-400 text-sm mt-2">Real trips, real catches, real Keys life</p>
          </div>
          {/* Replace YOUR_ELFSIGHT_APP_ID with your Elfsight widget ID */}
          {/* Sign up at elfsight.com, create an Instagram Feed widget, and paste your app ID below */}
          <div className="elfsight-app-lazy" data-elfsight-app-lazy></div>
        </div>

        {/* Newsletter / Follow CTA */}
        <div className="mt-16 bg-slate-900 rounded-2xl p-10 text-center text-white">
          <h3 className="font-heading text-2xl font-normal mb-3">Stay In The Loop</h3>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Follow us for fishing reports, Keys tips, and behind-the-scenes content.
            We post the stuff that actually helps you plan a better trip.
          </p>
          <div className="flex justify-center gap-4">
            <a href={socials.instagram} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform">
              <Instagram className="w-5 h-5" /> Instagram
            </a>
            <a href={socials.tiktok} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-xl font-semibold transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.65a8.35 8.35 0 004.76 1.49V6.69h-1z"/>
              </svg>
              TikTok
            </a>
            <a href={socials.facebook} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition-colors">
              <Facebook className="w-5 h-5" /> Facebook
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
