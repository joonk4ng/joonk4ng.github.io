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

  const handlePrint = async () => {
    try {
      const pdfData = await getPDF(pdfId);
      if (!pdfData) {
        throw new Error('PDF not found in storage');
      }

      // Create a URL for the PDF blob
      const url = URL.createObjectURL(pdfData.pdf);
      
      // Create a temporary iframe for printing
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      
      document.body.appendChild(printFrame);

      // Set the iframe source to the PDF URL
      printFrame.src = url;

      // Wait for the PDF to load in the iframe
      printFrame.onload = () => {
        try {
          // Try to print
          printFrame.contentWindow?.print();
          
          // Remove the iframe after printing
          setTimeout(() => {
            document.body.removeChild(printFrame);
            URL.revokeObjectURL(url);
          }, 1000);
        } catch (err) {
          console.error('Error during print:', err);
          document.body.removeChild(printFrame);
          URL.revokeObjectURL(url);
          setError('Failed to print PDF');
        }
      };
    } catch (error) {
      console.error('Error preparing PDF for print:', error);
      setError(error instanceof Error ? error.message : 'Failed to prepare PDF for printing');
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
              maxHeight: 'calc(100% - 50px)', // Leave space for the buttons
              objectFit: 'contain' 
            }} 
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              onClick={handleDownloadPDF}
              className="download-pdf-button"
              style={{
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
            <button 
              onClick={handlePrint}
              className="print-pdf-button"
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Print PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PDFPreviewViewer; 