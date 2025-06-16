import { Link } from 'react-router-dom'

function Dashboard({ clientData }) {
  const sections = [
    { id: 'general', label: 'General Settings', path: '/admin/general', icon: '⚙️' },
    { id: 'hero', label: 'Hero Section', path: '/admin/hero', icon: '🏆' },
    { id: 'about', label: 'About Section', path: '/admin/about', icon: 'ℹ️' },
    { id: 'services', label: 'Services Section', path: '/admin/services', icon: '🛠️' },
    { id: 'features', label: 'Features Section', path: '/admin/features', icon: '✨' },
    { id: 'gallery', label: 'Gallery Section', path: '/admin/gallery', icon: '🖼️' },
    { id: 'testimonials', label: 'Testimonials Section', path: '/admin/testimonials', icon: '💬' },
    { id: 'faq', label: 'FAQ Section', path: '/admin/faq', icon: '❓' },
    { id: 'contact', label: 'Contact Section', path: '/admin/contact', icon: '📞' },
    { id: 'social', label: 'Social Media', path: '/admin/social', icon: '📱' },
    { id: 'config', label: 'Display Settings', path: '/admin/config', icon: '🎨' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">Welcome to the Admin Panel</h2>
        <p className="text-gray-600 mb-4">
          This interface allows you to edit your website content and see a live preview of your changes.
          Click any section below to begin editing.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm">
          <p>Your website is currently titled: <strong>{clientData.siteTitle}</strong></p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {sections.map(section => (
          <Link
            key={section.id}
            to={section.path}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="text-3xl mb-2">{section.icon}</div>
            <h3 className="font-medium">{section.label}</h3>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Dashboard