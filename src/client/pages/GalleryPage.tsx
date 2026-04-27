import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { trpc } from '../lib/trpc';

const categories = ['all', 'boats', 'fishing', 'destinations', 'lifestyle', 'sunset', 'videos'];

export default function GalleryPage() {
  useEffect(() => { document.title = 'Photos & Videos — Florida Keys Boat Rentals | Blue Skies Boat Rentals'; }, []);
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const { data: images } = trpc.gallery.byCategory.useQuery(activeCategory);

  return (
    <div>
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
                onClick={() => !isVideo && setLightbox(img.imageUrl)}
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
                  <img src={img.imageUrl} alt={img.caption ?? ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4"
          >
            <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
              <X className="w-8 h-8" />
            </button>
            {lightbox.endsWith('.mp4') || lightbox.endsWith('.mov') ? (
              <video src={lightbox} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg" />
            ) : (
              <img src={lightbox} alt="" className="max-w-full max-h-[90vh] rounded-lg" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Book CTA */}
      <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-slate-600 text-sm">Like what you see? These are real trips — yours could be next.</p>
          <Link
            to="/book"
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all shadow-lg shadow-sky-500/25"
          >
            Book Your Boat <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
