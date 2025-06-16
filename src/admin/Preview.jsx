import { useState, useEffect, useRef } from 'react';

function Preview({ clientData }) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current || !clientData) return;

    // Post message to iframe with updated client data
    const iframe = iframeRef.current;
    const message = { type: 'UPDATE_CLIENT_DATA', clientData };
    
    try {
      iframe.contentWindow.postMessage(message, '*');
    } catch (err) {
      console.error('Error sending data to preview:', err);
    }
  }, [clientData, iframeLoaded]);

  // Handle manual refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setIframeLoaded(false);
  };

  useEffect(() => {
    const handlePreviewUpdate = (event) => {
      if (iframeRef.current && event.detail?.data) {
        // Send updated data to the iframe
        iframeRef.current.contentWindow.postMessage({
          type: 'UPDATE_CLIENT_DATA',
          clientData: event.detail.data
        }, '*');
      }
    };
    
    window.addEventListener('adminPreviewUpdate', handlePreviewUpdate);
    return () => window.removeEventListener('adminPreviewUpdate', handlePreviewUpdate);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <h3 className="font-medium">Live Preview</h3>
        <button 
          onClick={handleRefresh}
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
        >
          Refresh
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {!iframeLoaded && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
        <iframe
          key={refreshKey}
          ref={iframeRef}
          src="/?preview=true"
          className="w-full h-full"
          onLoad={() => setIframeLoaded(true)}
          style={{ opacity: iframeLoaded ? 1 : 0 }}
          title="Website Preview"
        />
      </div>
    </div>
  );
}

export default Preview;