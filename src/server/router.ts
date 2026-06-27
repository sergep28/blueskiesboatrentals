import { router } from './trpc.js';
import { boatsRouter } from './routes/boats.js';
import { bookingsRouter } from './routes/bookings.js';
import { captainsRouter, galleryRouter, reviewsRouter, partnersRouter, rewardsRouter, usersRouter, statsRouter } from './routes/misc.js';
import { blogRouter } from './routes/blog.js';
import { quotesRouter } from './routes/quotes.js';
import { blackoutsRouter } from './routes/blackouts.js';
import { propertiesRouter } from './routes/properties.js';
import { waiversRouter } from './routes/waivers.js';
import { inspectionsRouter } from './routes/inspections.js';
import { systemRouter } from './routes/system.js';
import { marketingRouter } from './routes/marketing.js';

export const appRouter = router({
  boats: boatsRouter,
  bookings: bookingsRouter,
  captains: captainsRouter,
  gallery: galleryRouter,
  reviews: reviewsRouter,
  partners: partnersRouter,
  rewards: rewardsRouter,
  users: usersRouter,
  stats: statsRouter,
  blog: blogRouter,
  quotes: quotesRouter,
  blackouts: blackoutsRouter,
  properties: propertiesRouter,
  waivers: waiversRouter,
  inspections: inspectionsRouter,
  system: systemRouter,
  marketing: marketingRouter,
});

export type AppRouter = typeof appRouter;
