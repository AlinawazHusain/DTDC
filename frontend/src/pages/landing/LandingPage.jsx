import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import HeroSection from './HeroSection'
import {
  FeaturesSection,
  InvoicePreview,
  CTASection,
} from './LandingSections'

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <InvoicePreview />
      <CTASection />
      <Footer />
    </>
  )
}
