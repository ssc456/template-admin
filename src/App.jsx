import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import AboutSection from './components/AboutSection'
import ServicesSection from './components/ServicesSection'
import FeaturesSection from './components/FeaturesSection'
import GallerySection from './components/GallerySection'
import TestimonialsSection from './components/TestimonialsSection'
import FAQSection from './components/FAQSection'
import ContactSection from './components/ContactSection'
import Footer from './components/Footer'

function App() {
  const [content, setContent] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    // Check if we're in preview mode
    const urlParams = new URLSearchParams(window.location.search)
    const preview = urlParams.get('preview') === 'true'
    setIsPreview(preview)
    
    if (preview) {
      // Set up message listener for preview data
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'UPDATE_CLIENT_DATA' && event.data.clientData) {
          const { clientData } = event.data
          setContent(clientData)
          if (clientData.config) {
            setConfig(clientData.config)
          }
          setLoading(false)
          
          if (clientData.siteTitle) {
            document.title = clientData.siteTitle
          }
        }
      }
      
      window.addEventListener('message', handleMessage)
      
      // Notify parent that we're ready for data
      if (window.parent) {
        window.parent.postMessage({ type: 'PREVIEW_READY' }, '*')
      }
      
      return () => window.removeEventListener('message', handleMessage)
    } else {
      // Normal loading from client.json
      Promise.all([fetch('/client.json').then(r => r.json())])
        .then(([client]) => {
          setContent(client)

          if (client.config) {
            setConfig(client.config)
          }
          setLoading(false)

          // Set the page title from client.json
          if (client.siteTitle) {
            document.title = client.siteTitle
          }
        })
        .catch(console.error)
    }
  }, [])

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-16 w-16 border-4 border-pink-200 border-t-pink-600 mx-auto mb-4' />
          <p className='text-gray-600 text-lg'>Loading…</p>
        </div>
      </div>
    )
  }

  if (!content || !config) return null

  return (
    <div className='min-h-screen bg-white scroll-smooth'>
      <Header siteTitle={content.siteTitle} logoUrl={content.logoUrl} config={config} primaryColor={config.primaryColor} />
      <AnimatePresence mode='wait'>
        {config.showHero && (
          <HeroSection key='hero' {...content.hero} primaryColor={config.primaryColor} secondaryColor={config.secondaryColor} animations={config.animations} />
        )}
        {config.showAbout && <AboutSection key='about' {...content.about} primaryColor={config.primaryColor} />}
        {config.showServices && <ServicesSection key='services' {...content.services} primaryColor={config.primaryColor} secondaryColor={config.secondaryColor} />}
        {config.showFeatures && <FeaturesSection key='features' {...content.features} primaryColor={config.primaryColor} />}
        {config.showGallery && <GallerySection key='gallery' {...content.gallery} primaryColor={config.primaryColor} />}
        {config.showTestimonials && <TestimonialsSection key='testimonials' {...content.testimonials} primaryColor={config.primaryColor} />}
        {config.showFAQ && <FAQSection key='faq' {...content.faq} primaryColor={config.primaryColor} />}
        {config.showContact && <ContactSection key='contact' {...content.contact} primaryColor={config.primaryColor} />}
      </AnimatePresence>
      <Footer social={content.social} primaryColor={config.primaryColor} siteTitle={content.siteTitle} />
      
      {/* Preview Mode Indicator */}
      {isPreview && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm shadow-lg">
          Preview Mode
        </div>
      )}
    </div>
  )
}

export default App