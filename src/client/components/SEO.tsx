import { Helmet } from 'react-helmet-async';

const SITE = 'https://blueskiesboatrentals.com';
const SITE_NAME = 'Blue Skies Boat Rentals';
const DEFAULT_IMAGE = `${SITE}/boat-alligator-reef.jpeg`;
const DEFAULT_DESC = 'Best boat rentals in the Florida Keys. Premium Grady White boats available bareboat or with a USCG-licensed captain. Based in Islamorada, serving Key Largo to Marathon. Book online today.';

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  noindex?: boolean;
}

export default function SEO({
  title,
  description = DEFAULT_DESC,
  path = '',
  image = DEFAULT_IMAGE,
  type = 'website',
  publishedTime,
  noindex,
}: SEOProps) {
  const url = `${SITE}${path}`;
  const fullImage = image.startsWith('http') ? image : `${SITE}${image}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
}
