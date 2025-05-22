import React, { useEffect, useState } from 'react';
import { getPDF } from '../utils/pdfStorage';
import '../styles/PDFPreviewViewer.css';

interface PDFPreviewViewerProps {
  pdfId: string;
  onLoad?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const PDFPreviewViewer: React.FC<PDFPreviewViewerProps> = ({ pdfId, onLoad, className, style }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadPreview = async () => {
      if (!pdfId) {
        console.log('No PDF ID provided');
        return;
      }

      try {
        console.log('Retrieving PDF data from IndexedDB:', pdfId);
        const pdfData = await getPDF(pdfId);
        
        if (!pdfData) {
          throw new Error('PDF not found in storage');
        }

        if (!pdfData.preview) {
          throw new Error('No preview available for this PDF');
        }

        // Create a URL for the preview blob
        const url = URL.createObjectURL(pdfData.preview);
        
        if (isMounted) {
          setPreviewUrl(url);
          setLoading(false);
          if (onLoad) {
            onLoad();
          }
        }
      } catch (error) {
        console.error('Error loading preview:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to load preview');
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isMounted = false;
      // Clean up the preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [pdfId, onLoad]);

  const handleDownloadPDF = async () => {
    try {
      const pdfData = await getPDF(pdfId);
      if (!pdfData) {
        throw new Error('PDF not found in storage');
      }

      // Create a URL for the PDF blob
      const url = URL.createObjectURL(pdfData.pdf);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfData.metadata.filename || 'document.pdf';
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError(error instanceof Error ? error.message : 'Failed to download PDF');
    }
  };

  if (loading) {
    return <div>Loading preview...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div 
      className={`pdf-preview-viewer ${className || ''}`}
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...style 
      }}
    >
      {previewUrl && (
        <>
          <img 
            src={previewUrl} 
            alt="PDF Preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: 'calc(100% - 50px)', // Leave space for the button
              objectFit: 'contain' 
            }} 
          />
          <button 
            onClick={handleDownloadPDF}
            className="download-pdf-button"
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Download PDF
          </button>
        </>
      )}
    </div>
  );
};

export default PDFPreviewViewer; 