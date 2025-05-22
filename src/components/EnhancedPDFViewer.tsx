import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getPDF } from '../utils/pdfStorage';
import '../styles/EnhancedPDFViewer.css';
import { PDFDocument } from 'pdf-lib';
import { generateExportFilename } from '../utils/filenameGenerator';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

// Configure PDF.js options for small PDFs
const pdfOptions = {
  disableAutoFetch: true,     // Disable fetching of external resources for small PDFs
  disableStream: true,        // Disable streaming for small PDFs
  disableFontFace: false,     // Allow using system fonts
  useSystemFonts: true,       // Prefer system fonts when available
  enableXfa: true,            // Enable XFA form support
  isEvalSupported: false,     // Disable eval for security
  maxImageSize: 4096 * 4096,  // Set maximum image size
  cMapUrl: undefined,         // Don't try to load external character maps
  standardFontDataUrl: undefined  // Don't try to load external fonts
};

interface EnhancedPDFViewerProps {
  pdfId?: string;
  onSave?: (pdfData: Blob, previewImage: Blob) => void;
  className?: string;
  style?: React.CSSProperties;
  readOnly?: boolean;
  crewInfo?: {
    crewNumber: string;
    fireName: string;
    fireNumber: string;
  };
  date?: string;
}

const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = ({
  pdfId,
  onSave,
  className,
  style,
  readOnly = false,
  crewInfo,
  date
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawWidth, setDrawWidth] = useState(2);
  const [isSigned, setIsSigned] = useState(false);
  const [signedPdfBlob, setSignedPdfBlob] = useState<Blob | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const renderPDF = useCallback(async (pdfDoc: pdfjsLib.PDFDocumentProxy) => {
    if (!canvasRef.current || !drawCanvasRef.current) return;

    try {
      setIsLoading(true);
      const page = await pdfDoc.getPage(1); // Always render first page
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', {
        alpha: false,  // Optimize for non-transparent content
        willReadFrequently: false  // Optimize for write-only operations
      });
      
      const drawCanvas = drawCanvasRef.current;
      const drawContext = drawCanvas.getContext('2d', {
        alpha: true,
        willReadFrequently: true  // Drawing needs read operations
      });

      if (!context || !drawContext) return;

      // Get the PDF's original dimensions
      const viewport = page.getViewport({ scale: 1.0 });
      
      // Calculate optimal scale based on container size
      const container = containerRef.current;
      if (container) {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const scale = Math.min(
          containerWidth / viewport.width,
          containerHeight / viewport.height
        );
        viewport.scale = scale;
      }
      
      // Set canvas sizes to match viewport
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      drawCanvas.height = viewport.height;
      drawCanvas.width = viewport.width;

      // Clear both canvases
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawContext.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

      // Render PDF page with optimized settings
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      setIsLoading(false);
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Failed to render page. Please try again.');
      setIsLoading(false);
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawCanvasRef.current) return;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;
    lastPosRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawCanvasRef.current || !lastPosRef.current) return;

    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentPos = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };

    ctx.beginPath();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawWidth;
    ctx.lineCap = 'round';
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPosRef.current = currentPos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = async () => {
    if (!canvasRef.current || !drawCanvasRef.current || !onSave || !pdfDocRef.current) return;

    try {
      // Get both canvases
      const baseCanvas = canvasRef.current;
      const drawCanvas = drawCanvasRef.current;

      // Create a temporary canvas to combine both layers
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = baseCanvas.width;
      tempCanvas.height = baseCanvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) return;

      // Draw the base PDF
      tempCtx.drawImage(baseCanvas, 0, 0);
      // Draw the annotations on top
      tempCtx.drawImage(drawCanvas, 0, 0);

      // Get the combined preview as PNG
      const previewImage = await new Promise<Blob>((resolve) => {
        tempCanvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      // Get the drawing canvas content as a PNG for annotations
      const annotationImage = await new Promise<Blob>((resolve) => {
        drawCanvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      // Convert the original PDF to Uint8Array
      const pdfBytes = await pdfDocRef.current.getData();
      
      // Load the PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Convert PNG blob to Uint8Array
      const annotationBytes = new Uint8Array(await annotationImage.arrayBuffer());
      
      // Embed the PNG image
      const annotationPngImage = await pdfDoc.embedPng(annotationBytes);
      
      // Get page dimensions
      const { width, height } = firstPage.getSize();
      
      // Draw the annotation image on top of the PDF
      firstPage.drawImage(annotationPngImage, {
        x: 0,
        y: 0,
        width,
        height,
        opacity: 1,
      });

      // Save the PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const modifiedPdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      
      // Set the signed state and store the signed PDF blob
      setIsSigned(true);
      setSignedPdfBlob(modifiedPdfBlob);
      
      onSave(modifiedPdfBlob, previewImage);
    } catch (err) {
      console.error('Error saving PDF:', err);
      setError('Failed to save PDF with annotations.');
    }
  };

  const handleDownload = async () => {
    try {
      if (!pdfDocRef.current) return;

      // Get the current PDF data
      const pdfBytes = await pdfDocRef.current.getData();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // Create a URL for the PDF blob
      const url = URL.createObjectURL(pdfBlob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename using crew info if available
      if (crewInfo && date) {
        link.download = generateExportFilename({
          date,
          crewNumber: crewInfo.crewNumber,
          fireName: crewInfo.fireName,
          fireNumber: crewInfo.fireNumber,
          type: 'PDF'
        });
      } else {
        link.download = 'signed_document.pdf';
      }
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF.');
    }
  };

  useEffect(() => {
    let mounted = true;
    let currentPdf: pdfjsLib.PDFDocumentProxy | null = null;

    const loadPDF = async () => {
      if (!pdfId) return;

      try {
        setIsLoading(true);
        setError(null);
        
        const storedPDF = await getPDF(pdfId);
        if (!storedPDF || !mounted) return;

        // Create a buffer for loading
        const arrayBuffer = await storedPDF.pdf.arrayBuffer();
        if (!mounted) return;

        // Create loading task
        const loadingTask = pdfjsLib.getDocument({ 
          data: arrayBuffer,
          ...pdfOptions
        });
        
        const pdf = await loadingTask.promise;
        
        if (!mounted) {
          pdf.destroy();
          return;
        }

        // Clean up previous PDF document
        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
        }

        currentPdf = pdf;
        pdfDocRef.current = pdf;

        await renderPDF(pdf);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (mounted) {
          setError('Failed to load PDF. Please try again.');
          setIsLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      mounted = false;
      if (currentPdf) {
        currentPdf.destroy();
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [pdfId, renderPDF]);

  return (
    <div className={`enhanced-pdf-viewer ${className || ''}`} style={style}>
      {!readOnly && (
        <div className="toolbar">
          <input
            type="color"
            value={drawColor}
            onChange={(e) => setDrawColor(e.target.value)}
            title="Drawing Color"
          />
          <input
            type="range"
            min="1"
            max="10"
            value={drawWidth}
            onChange={(e) => setDrawWidth(Number(e.target.value))}
            title="Drawing Width"
          />
          <button onClick={clearDrawing} className="clear-btn">Clear Drawing</button>
          <button onClick={handleSave} className="save-btn">Save with Signature</button>
          <button 
            onClick={handleDownload} 
            className="download-btn"
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
          >
            Download PDF
          </button>
        </div>
      )}

      <div className="canvas-container" ref={containerRef}>
        {error && <div className="error-message">{error}</div>}
        {isLoading && <div className="loading">Loading PDF...</div>}
        <canvas ref={canvasRef} className="pdf-canvas" />
        {!readOnly && (
          <canvas
            ref={drawCanvasRef}
            className="draw-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedPDFViewer; 