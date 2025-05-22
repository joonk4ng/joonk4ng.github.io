import React from 'react';
import PDFPreviewViewer from './PDFPreviewViewer';
import '../styles/PDFGenerationViewer.css';

interface PDFGenerationViewerProps {
  pdfId: string;
  onClose?: () => void;
}

const PDFGenerationViewer: React.FC<PDFGenerationViewerProps> = ({
  pdfId,
  onClose
}) => {
  return (
    <div className="pdf-generation-viewer">
      <PDFPreviewViewer
        pdfId={pdfId}
        onLoad={onClose}
        className="pdf-viewer"
      />
    </div>
  );
};

export default PDFGenerationViewer; 