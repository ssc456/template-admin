import { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import Dashboard from './Dashboard'
import GeneralEditor from './editors/GeneralEditor'
import HeroEditor from './editors/HeroEditor'
import AboutEditor from './editors/AboutEditor'
import ServicesEditor from './editors/ServicesEditor'
import FeaturesEditor from './editors/FeaturesEditor'
import GalleryEditor from './editors/GalleryEditor'
import TestimonialsEditor from './editors/TestimonialsEditor'
import FAQEditor from './editors/FAQEditor'
import ContactEditor from './editors/ContactEditor'
import SocialEditor from './editors/SocialEditor'
import ConfigEditor from './editors/ConfigEditor'
import Preview from './Preview'

function AdminLayout() {
  const [clientData, setClientData] = useState(null)
  const [originalData, setOriginalData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')
  
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Load the client data
    fetch('/client.json')
      .then(response => response.json())
      .then(data => {
        setClientData(data)
        setOriginalData(JSON.parse(JSON.stringify(data))) // Deep copy for comparison
        setLoading(false)
      })
      .catch(error => {
        console.error('Error loading client data:', error)
        toast.error('Failed to load website data')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    // Set active section based on URL
    const path = location.pathname.split('/')[2] || 'dashboard'
    setActiveSection(path)
  }, [location])

  // Save changes to the client.json file
  const handleSave = async () => {
    if (!clientData) return
    
    setSaving(true)
    try {
      // In a real production app, this would call an API endpoint
      // For local development, we'll use a simple mock API
      const response = await fetch('/api/save-client-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save changes')
      }
      
      setOriginalData(JSON.parse(JSON.stringify(clientData)))
      toast.success('Changes saved successfully!')
    } catch (error) {
      console.error('Error saving changes:', error)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // Check if there are unsaved changes
  const hasChanges = () => {
    if (!originalData || !clientData) return false
    return JSON.stringify(originalData) !== JSON.stringify(clientData)
  }
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin' },
    { id: 'general', label: 'General Settings', path: '/admin/general' },
    { id: 'hero', label: 'Hero Section', path: '/admin/hero' },
    { id: 'about', label: 'About Section', path: '/admin/about' },
    { id: 'services', label: 'Services', path: '/admin/services' },
    { id: 'features', label: 'Features', path: '/admin/features' },
    { id: 'gallery', label: 'Gallery', path: '/admin/gallery' },
    { id: 'testimonials', label: 'Testimonials', path: '/admin/testimonials' },
    { id: 'faq', label: 'FAQ', path: '/admin/faq' },
    { id: 'contact', label: 'Contact', path: '/admin/contact' },
    { id: 'social', label: 'Social Media', path: '/admin/social' },
    { id: 'config', label: 'Display Settings', path: '/admin/config' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {navItems.map(item => (
              <li key={item.id}>
                <Link 
                  to={item.path}
                  className={`flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white ${
                    activeSection === item.id ? 'bg-gray-700 text-white' : ''
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-700">
          <Link to="/" className="text-gray-400 hover:text-white flex items-center">
            <span className="mr-2">←</span>
            Back to Site
          </Link>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header with actions */}
        <header className="bg-white shadow-sm p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{navItems.find(item => item.id === activeSection)?.label || 'Dashboard'}</h2>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              View Site
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className={`px-4 py-2 rounded-md ${
                hasChanges()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editing Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {clientData && (
              <Routes>
                <Route path="/" element={<Dashboard clientData={clientData} />} />
                <Route path="/general" element={<GeneralEditor clientData={clientData} setClientData={setClientData} />} />
                <Route path="/hero" element={<HeroEditor clientData={clientData} setClientData={setClientData} />} />
                <Route path="/about" element={<AboutEditor clientData={clientData} setClientData={setClientData} />} />
                <Route path="/services" element={<ServicesEditor clientData={clientData} setClientData={setClientData} />} />
                <Route path="/features" element={<FeaturesEditor clientData={clientData} setClientData={setClientData} />} />
                <Route path="/gallery" element={<GalleryEditor clientData={clientData} setClientData={setClientData} />} />
                <Route path="/testimonials" element={<TestimonialsEditor clientData={clientData} setClientData={setClientData} />} />
                <Route path="/faq" element={<FAQEditor clientData={clientData} setClientData={setClientData} />} />
                <Route path="/contact" element={<ContactEditor clientData={clientData} setClientData={setClientData} />} />
                <Route path="/social" element={<SocialEditor clientData={clientData} setClientData={setClientData} />} />
                <Route path="/config" element={<ConfigEditor clientData={clientData} setClientData={setClientData} />} />
              </Routes>
            )}
          </div>
          
          {/* Preview Area */}
          <div className="w-1/2 border-l border-gray-200 overflow-hidden">
            <Preview clientData={clientData} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout