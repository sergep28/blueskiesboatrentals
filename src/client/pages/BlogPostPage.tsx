import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, ArrowRight, Instagram, Facebook, Youtube, Share2, Anchor } from 'lucide-react';
import { trpc } from '../lib/trpc';
import SEO from '../components/SEO';

const categoryLabels: Record<string, string> = {
  fishing_report: 'Fishing Report',
  keys_guide: 'Keys Guide',
  experiences: 'Experience',
  behind_the_scenes: 'Behind the Scenes',
  general: 'General',
};

function renderInline(text: string) {
  // Handle bold, links, and inline code
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={j} className="text-slate-900">{part.replace(/\*\*/g, '')}</strong>;
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return <a key={j} href={linkMatch[2]} className="text-sky-600 underline underline-offset-2 hover:text-sky-700">{linkMatch[1]}</a>;
    }
    return part;
  });
}

function renderContent(content: string) {
  return content.split('\n\n').map((block, i) => {
    const trimmed = block.trim();

    // Headings
    if (trimmed.startsWith('## ')) {
      return <h2 key={i} className="font-heading text-2xl text-slate-900 mt-10 mb-4">{trimmed.replace('## ', '')}</h2>;
    }

    // Images: ![alt](src)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      return (
        <figure key={i} className="my-8">
          <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full rounded-xl shadow-sm" loading="lazy" />
          {imgMatch[1] && <figcaption className="text-center text-slate-400 text-sm mt-2">{imgMatch[1]}</figcaption>}
        </figure>
      );
    }

    // Raw HTML blocks (YouTube embeds, etc.)
    if (trimmed.startsWith('<div') || trimmed.startsWith('<iframe')) {
      return <div key={i} className="my-8" dangerouslySetInnerHTML={{ __html: trimmed }} />;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote key={i} className="border-l-4 border-sky-300 pl-4 my-6 italic text-slate-600">
          {renderInline(trimmed.replace(/^> /, ''))}
        </blockquote>
      );
    }

    // Lists (- items)
    if (trimmed.split('\n').every(line => line.trim().startsWith('- '))) {
      return (
        <ul key={i} className="list-disc list-inside space-y-1.5 text-slate-700 mb-6 ml-2">
          {trimmed.split('\n').map((line, j) => (
            <li key={j}>{renderInline(line.trim().replace(/^- /, ''))}</li>
          ))}
        </ul>
      );
    }

    // Numbered lists
    if (trimmed.split('\n').every(line => /^\d+\.\s/.test(line.trim()))) {
      return (
        <ol key={i} className="list-decimal list-inside space-y-1.5 text-slate-700 mb-6 ml-2">
          {trimmed.split('\n').map((line, j) => (
            <li key={j}>{renderInline(line.trim().replace(/^\d+\.\s/, ''))}</li>
          ))}
        </ol>
      );
    }

    // Bold-only paragraph
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return <p key={i} className="text-slate-900 font-semibold mb-4">{trimmed.replace(/\*\*/g, '')}</p>;
    }

    // Regular paragraph with inline formatting
    return (
      <p key={i} className="text-slate-700 leading-relaxed mb-6">
        {renderInline(trimmed)}
      </p>
    );
  });
}

function RelatedPosts({ currentId, category }: { currentId: number; category: string }) {
  const { data: allPosts } = trpc.blog.list.useQuery();
  const related = (allPosts ?? [])
    .filter((p: any) => p.status === 'published' && p.id !== currentId)
    .sort((a: any, b: any) => {
      // Prioritize same category, then recency
      if (a.category === category && b.category !== category) return -1;
      if (b.category === category && a.category !== category) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section className="mt-16 pt-12 border-t border-slate-200">
      <h2 className="font-heading text-2xl text-slate-900 mb-8">Keep Reading</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {related.map((post: any) => (
          <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
            <div className="relative h-40 rounded-xl overflow-hidden mb-3">
              <img
                src={post.coverImage || '/freedom-aerial.jpg'}
                alt={post.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <span className="absolute top-2 left-2 bg-sky-500/90 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {categoryLabels[post.category] ?? post.category}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-sky-600 transition-colors mb-1">
              {post.title}
            </h3>
            <p className="text-slate-400 text-xs line-clamp-2">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Contextual internal links based on content keywords
function ContextLinks({ content, category }: { content: string; category: string }) {
  const lower = (content || '').toLowerCase();
  const links: { to: string; label: string; desc: string }[] = [];

  if (lower.includes('islamorada') || lower.includes('sandbar') || lower.includes('alligator reef')) {
    links.push({ to: '/islamorada', label: 'Explore Islamorada', desc: 'Our home base — sandbars, Alligator Reef, and more' });
  }
  if (lower.includes('key largo') || lower.includes('pennekamp') || lower.includes('molasses reef')) {
    links.push({ to: '/key-largo', label: 'Explore Key Largo', desc: 'Diving capital of the world, 20 min from our dock' });
  }
  if (lower.includes('marathon') || lower.includes('sombrero') || lower.includes('seven mile')) {
    links.push({ to: '/marathon', label: 'Explore Marathon', desc: 'Heart of the Keys — Sombrero Reef and beyond' });
  }
  if (category === 'fishing_report' || lower.includes('fishing') || lower.includes('mahi') || lower.includes('tuna')) {
    links.push({ to: '/experiences', label: 'Fishing Experiences', desc: 'See all our offshore and reef fishing trips' });
  }
  if (lower.includes('sunset') || lower.includes('cruise')) {
    links.push({ to: '/experiences', label: 'Sunset Cruises', desc: 'BYOB sunset cruises from Islamorada' });
  }

  // Deduplicate by path
  const unique = links.filter((link, i) => links.findIndex(l => l.to === link.to) === i).slice(0, 3);

  if (unique.length === 0) return null;

  return (
    <div className="mt-10 bg-sky-50 rounded-2xl p-6 border border-sky-100">
      <p className="font-semibold text-slate-900 text-sm mb-4">Related pages you might like</p>
      <div className="grid gap-3">
        {unique.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center justify-between p-3 bg-white rounded-xl hover:shadow-sm transition-shadow group"
          >
            <div>
              <p className="text-slate-900 font-medium text-sm group-hover:text-sky-600 transition-colors">{link.label}</p>
              <p className="text-slate-400 text-xs">{link.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const { data: post } = trpc.blog.getBySlug.useQuery(slug ?? '');

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
    image: p.coverImage ? `https://blueskiesboatrentals.com${p.coverImage}` : undefined,
    datePublished: p.createdAt,
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
      <SEO
        title={p.title}
        description={p.excerpt || `${p.title} — Read on the Blue Skies Boat Rentals blog.`}
        path={`/blog/${p.slug}`}
        image={p.coverImage || '/boat-alligator-reef.jpeg'}
        type="article"
        publishedTime={p.createdAt}
      />
      {/* Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px]">
        <img src={p.coverImage ?? '/boat-alligator-reef.jpeg'} alt={p.title} className="w-full h-full object-cover" />
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
                {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
            <a
              href="https://www.youtube.com/@BlueSkiesFloridaKeys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-red-500 text-sm font-medium mt-3 ml-4 hover:text-red-600"
            >
              <Youtube className="w-4 h-4" /> YouTube
            </a>
          </div>
        </div>

        {/* Social links for this post */}
        {(p.instagramUrl || p.tiktokUrl || p.facebookUrl) && (
          <div className="mt-8 p-6 bg-slate-50 rounded-2xl">
            <p className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4" /> See this on social
            </p>
            <div className="flex gap-3">
              {p.instagramUrl && (
                <a href={p.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <Instagram className="w-4 h-4" /> Instagram
                </a>
              )}
              {p.facebookUrl && (
                <a href={p.facebookUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <Facebook className="w-4 h-4" /> Facebook
                </a>
              )}
            </div>
          </div>
        )}

        {/* Contextual internal links */}
        <ContextLinks content={p.content} category={p.category} />

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

        {/* Related posts */}
        <RelatedPosts currentId={p.id} category={p.category} />
      </div>
    </div>
  );
}
