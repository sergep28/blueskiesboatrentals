import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, Instagram, Facebook, Share2, Anchor } from 'lucide-react';
import { trpc } from '../lib/trpc';

const categoryLabels: Record<string, string> = {
  fishing_report: 'Fishing Report',
  keys_guide: 'Keys Guide',
  experiences: 'Experience',
  behind_the_scenes: 'Behind the Scenes',
  general: 'General',
};

function renderContent(content: string) {
  return content.split('\n\n').map((block, i) => {
    if (block.startsWith('## ')) {
      return <h2 key={i} className="font-heading text-2xl text-slate-900 mt-10 mb-4">{block.replace('## ', '')}</h2>;
    }
    if (block.startsWith('**') && block.endsWith('**')) {
      return <p key={i} className="text-slate-900 font-semibold mb-4">{block.replace(/\*\*/g, '')}</p>;
    }
    // Handle paragraphs with inline bold
    const parts = block.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={i} className="text-slate-700 leading-relaxed mb-6">
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="text-slate-900">{part.replace(/\*\*/g, '')}</strong>;
          }
          return part;
        })}
      </p>
    );
  });
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const { data: post } = trpc.blog.getBySlug.useQuery(slug ?? '');
  useEffect(() => {
    if (post) document.title = `${(post as any).title} | Blue Skies Boat Rentals`;
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Loading...</p>
          <Link to="/blog" className="text-sky-500 text-sm hover:text-sky-600">Back to Blog</Link>
        </div>
      </div>
    );
  }

  const p = post as any;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title,
    description: p.excerpt,
    image: p.cover_image ? `https://blueskiesboatrentals.com${p.cover_image}` : undefined,
    datePublished: p.created_at,
    author: {
      '@type': 'Person',
      name: p.author,
      url: 'https://blueskiesboatrentals.com/about',
      jobTitle: 'Co-Founder',
      worksFor: {
        '@type': 'LocalBusiness',
        name: 'Blue Skies Boat Rentals',
        url: 'https://blueskiesboatrentals.com',
      },
    },
    publisher: {
      '@type': 'Organization',
      name: 'Blue Skies Boat Rentals',
      url: 'https://blueskiesboatrentals.com',
    },
  };

  return (
    <div>
      {/* Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px]">
        <img src={p.cover_image ?? '/boat-alligator-reef.jpeg'} alt={p.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-3xl mx-auto">
            <Link to="/blog" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to The Log
            </Link>
            <span className="block bg-sky-500/80 backdrop-blur text-white text-xs px-3 py-1 rounded-full font-medium w-fit mb-3">
              {categoryLabels[p.category] ?? p.category}
            </span>
            <h1 className="font-heading text-3xl md:text-5xl font-normal text-white mb-3">{p.title}</h1>
            <div className="flex items-center gap-4 text-white/60 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span>By {p.author}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="prose prose-lg max-w-none"
        >
          {renderContent(p.content)}
        </motion.div>

        {/* Tags */}
        {p.tags && (
          <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-slate-100">
            {JSON.parse(p.tags).map((tag: string) => (
              <span key={tag} className="text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        {/* Author Bio */}
        <div className="mt-10 p-6 bg-slate-50 rounded-2xl flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
            <Anchor className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-lg">Serge Parakhnevich</p>
            <p className="text-sky-600 text-sm mb-2">Co-Founder, Blue Skies Boat Rentals</p>
            <p className="text-slate-500 text-sm leading-relaxed">
              Serge co-founded Blue Skies Boat Rentals with a simple conviction: the Florida Keys
              boat rental experience should match the destination. With a background in financial
              services and a no-compromise approach to quality, he and co-founder Robert Garan
              built Blue Skies for boaters who expect more. Based in Islamorada — the sport
              fishing capital of the world.
            </p>
            <a
              href="https://www.instagram.com/blueskiescharter/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sky-600 text-sm font-medium mt-3 hover:text-sky-700"
            >
              <Instagram className="w-4 h-4" /> @blueskiescharter
            </a>
          </div>
        </div>

        {/* Social links for this post */}
        {(p.instagram_url || p.tiktok_url || p.facebook_url) && (
          <div className="mt-8 p-6 bg-slate-50 rounded-2xl">
            <p className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4" /> See this on social
            </p>
            <div className="flex gap-3">
              {p.instagram_url && (
                <a href={p.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <Instagram className="w-4 h-4" /> Instagram
                </a>
              )}
              {p.facebook_url && (
                <a href={p.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <Facebook className="w-4 h-4" /> Facebook
                </a>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-slate-900 to-slate-950 rounded-2xl p-8 text-center text-white">
          <h3 className="font-heading text-2xl font-normal mb-2">Ready to Experience This?</h3>
          <p className="text-slate-300 mb-6">Stop reading about it. Go do it.</p>
          <Link
            to="/book"
            className="inline-block bg-gradient-to-r from-sky-500 to-teal-500 text-white px-8 py-3 rounded-xl font-semibold hover:scale-105 transition-transform"
          >
            Book Your Boat
          </Link>
        </div>
      </div>
    </div>
  );
}
