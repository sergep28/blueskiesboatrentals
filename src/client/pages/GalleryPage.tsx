import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { trpc } from '../lib/trpc';
import SEO from '../components/SEO';

const categories = ['all', 'boats', 'fishing', 'destinations', 'lifestyle', 'sunset', 'videos'];

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { data: images } = trpc.gallery.byCategory.useQuery(activeCategory);

  const photoImages = (images ?? []).filter(img => !img.imageUrl.endsWith('.mp4') && !img.imageUrl.endsWith('.mov'));
  const lightboxPrev = () => setLightboxIndex(i => i !== null ? (i - 1 + photoImages.length) % photoImages.length : null);
  const lightboxNext = () => setLightboxIndex(i => i !== null ? (i + 1) % photoImages.length : null);

  return (
    <div>
      <SEO
        title="Photos & Videos — Florida Keys Boat Rentals"
        description="See real photos and videos from Blue Skies boat rentals in the Florida Keys. Grady White boats, fishing catches, sandbars, sunsets, and more from Islamorada."
        path="/gallery"
      />
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-heading text-4xl font-normal mb-4">Boat Rental Photos</h1>
          <p className="text-slate-300">See what awaits you on the water in the Florida Keys</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                activeCategory === cat
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images?.map((img, i) => {
            const isVideo = img.imageUrl.endsWith('.mp4') || img.imageUrl.endsWith('.mov');
            return (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => { if (!isVideo) { const idx = photoImages.findIndex(p => p.imageUrl === img.imageUrl); setLightboxIndex(idx >= 0 ? idx : null); } }}
                className={`group relative rounded-xl overflow-hidden ${isVideo ? 'aspect-[9/16] row-span-2' : 'aspect-[4/3]'} ${!isVideo ? 'cursor-pointer' : ''}`}
              >
                {isVideo ? (
                  <video
                    src={img.imageUrl}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img src={img.imageUrl} alt={img.caption ?? ''} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-end">
                  <p className="text-white p-4 text-sm opacity-0 group-hover:opacity-100 transition-opacity">{img.caption}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && photoImages[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4"
          >
            <button className="absolute top-4 right-4 text-white z-10" onClick={() => setLightboxIndex(null)}>
              <X className="w-8 h-8" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); lightboxPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); lightboxNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <img
              src={photoImages[lightboxIndex].imageUrl}
              alt={photoImages[lightboxIndex].caption ?? ''}
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={e => e.stopPropagation()}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {lightboxIndex + 1} / {photoImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Book CTA */}
      <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-center">
          <Link
            to="/book"
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-8 py-2.5 rounded-full transition-all shadow-lg shadow-sky-500/25"
          >
            Book Your Boat <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
