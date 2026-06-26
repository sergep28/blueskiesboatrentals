import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import GalleryPage from './pages/GalleryPage';
import MyBookingsPage from './pages/MyBookingsPage';
import LoyaltyPage from './pages/LoyaltyPage';
import PartnerPage from './pages/PartnerPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import LocationPage from './pages/LocationPage';
import AboutPage from './pages/AboutPage';
import ExperiencesPage from './pages/ExperiencesPage';
import StaysPage from './pages/StaysPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import WaiverPage from './pages/WaiverPage';
import InspectionPage from './pages/InspectionPage';
import BoatDetailPage from './pages/BoatDetailPage';
import KeysGuidePage from './pages/KeysGuidePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBookings from './pages/admin/AdminBookings';
import AdminFleet from './pages/admin/AdminFleet';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminPartners from './pages/admin/AdminPartners';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminRewards from './pages/admin/AdminRewards';
import AdminMarketing from './pages/admin/AdminMarketing';
import GiftCardPage from './pages/GiftCardPage';
import NotFoundPage from './pages/NotFoundPage';
import RentalAgreementPage from './pages/RentalAgreementPage';
import AdminQuotes from './pages/admin/AdminQuotes';
import AdminBlog from './pages/admin/AdminBlog';
import AdminStays from './pages/admin/AdminStays';
import AdminWaivers from './pages/admin/AdminWaivers';
import AdminInspections from './pages/admin/AdminInspections';
import AdminEmail from './pages/admin/AdminEmail';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/booking/success/:ref" element={<BookingSuccessPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/experiences" element={<ExperiencesPage />} />
        <Route path="/stays" element={<StaysPage />} />
        <Route path="/stays/:slug" element={<PropertyDetailPage />} />
        <Route path="/guide" element={<KeysGuidePage />} />
        <Route path="/gift" element={<GiftCardPage />} />
        <Route path="/boat/:id" element={<BoatDetailPage />} />
        <Route path="/partners" element={<PartnerPage />} />
        <Route path="/rental-agreement" element={<RentalAgreementPage />} />
        <Route path="/waiver" element={<WaiverPage />} />
        <Route path="/waiver/:ref" element={<WaiverPage />} />
        <Route path="/inspection/:ref" element={<InspectionPage />} />
        <Route path="/inspection" element={<InspectionPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/:location" element={<LocationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="fleet" element={<AdminFleet />} />
        <Route path="stays" element={<AdminStays />} />
        <Route path="waivers" element={<AdminWaivers />} />
        <Route path="inspections" element={<AdminInspections />} />
        <Route path="email" element={<AdminEmail />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="rewards" element={<AdminRewards />} />
        <Route path="marketing" element={<AdminMarketing />} />
        <Route path="partners" element={<AdminPartners />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="quotes" element={<AdminQuotes />} />
        <Route path="blog" element={<AdminBlog />} />
      </Route>
    </Routes>
    </>
  );
}
