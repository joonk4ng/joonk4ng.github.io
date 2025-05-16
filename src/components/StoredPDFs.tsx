import React, { useEffect, useState, useRef } from 'react';
import { listPDFs, deletePDF, getPDF, storePDF } from '../utils/pdfStorage';
import { PDFDocument } from 'pdf-lib';

interface StoredPDF {
  id: string;
  pdf: Blob;
  metadata: {
    filename: string;
    date: string;
    crewNumber: string;
    fireName: string;
    fireNumber: string;
  };
  timestamp: string;
}

interface Point {
  x: number;
  y: number;
}

type SortField = 'date' | 'crewNumber' | 'fireName' | 'timestamp';
type SortDirection = 'asc' | 'desc';

export default function StoredPDFs() {
  const [pdfs, setPdfs] = useState<StoredPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<StoredPDF | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1000 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPoint = useRef<Point | null>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null);

  // Initialize canvas context and handle resize
  useEffect(() => {
    if (canvasRef.current && drawingMode) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.lineCap = 'round';
        contextRef.current = context;
      }

      // Update canvas size based on PDF viewer size
      const updateCanvasSize = () => {
        if (pdfViewerRef.current) {
          const { width, height } = pdfViewerRef.current.getBoundingClientRect();
          setCanvasSize({ width, height });
          canvas.width = width;
          canvas.height = height;
          
          // Restore context properties after resize
          if (context) {
            context.strokeStyle = 'black';
            context.lineWidth = 2;
            context.lineCap = 'round';
          }
        }
      };

      // Initial size update
      updateCanvasSize();

      // Add resize listener
      const resizeObserver = new ResizeObserver(updateCanvasSize);
      if (pdfViewerRef.current) {
        resizeObserver.observe(pdfViewerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [drawingMode]);

  // Cleanup function for URL objects
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingMode) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point = getEventPoint(event, rect);
    
    lastPoint.current = point;
    
    const context = contextRef.current;
    if (context) {
      context.beginPath();
      context.moveTo(point.x, point.y);
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point = getEventPoint(event, rect);
    
    const context = contextRef.current;
    if (context && lastPoint.current) {
      context.beginPath();
      context.moveTo(lastPoint.current.x, lastPoint.current.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }
    
    lastPoint.current = point;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const getEventPoint = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    rect: DOMRect
  ): Point => {
    if ('touches' in event) {
      const touch = event.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
  };

  const clearDrawing = () => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (context && canvas) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveDrawing = async () => {
    if (!selectedPDF || !canvasRef.current) return;

    try {
      setLoading(true);
      setError(null);

      // Get the drawing as a PNG
      const canvas = canvasRef.current;
      const drawingBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      // Load the original PDF
      const pdfArrayBuffer = await selectedPDF.pdf.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
      
      // Convert PNG to PDF-compatible format
      const drawingImage = await pdfDoc.embedPng(await drawingBlob.arrayBuffer());
      
      // Get the first page
      const page = pdfDoc.getPages()[0];
      const { width, height } = page.getSize();

      // Add the drawing to the PDF
      page.drawImage(drawingImage, {
        x: 0,
        y: 0,
        width,
        height,
        opacity: 0.8
      });

      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const modifiedPdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

      // Store the modified PDF
      await storePDF(modifiedPdfBlob, selectedPDF.metadata);
      
      // Refresh the PDF list
      await refreshPDFs();
      
      // Clear the drawing
      clearDrawing();
      setDrawingMode(false);

    } catch (error) {
      console.error('Error saving drawing:', error);
      setError('Failed to save drawing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshPDFs = async () => {
    try {
      console.log('Refreshing PDFs...');
      setLoading(true);
      setError(null);
      const storedPDFs = await listPDFs();
      console.log('Refreshed PDFs:', storedPDFs);
      setPdfs(storedPDFs);
      
      // If we have a selected PDF, update it with the refreshed data
      if (selectedPDF) {
        const updatedPDF = storedPDFs.find(pdf => pdf.id === selectedPDF.id);
        if (updatedPDF) {
          setSelectedPDF(updatedPDF);
        }
      }
    } catch (error) {
      console.error('Error refreshing PDFs:', error);
      setError('Failed to refresh PDFs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('StoredPDFs component mounted');
    refreshPDFs();
  }, []);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedPDFs = [...pdfs].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'date':
        comparison = a.metadata.date.localeCompare(b.metadata.date);
        break;
      case 'crewNumber':
        comparison = a.metadata.crewNumber.localeCompare(b.metadata.crewNumber);
        break;
      case 'fireName':
        comparison = a.metadata.fireName.localeCompare(b.metadata.fireName);
        break;
      case 'timestamp':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleOpen = async (pdf: StoredPDF) => {
    try {
      console.log('Opening PDF:', pdf.metadata.filename);
      
      // Clean up previous URL if it exists
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      // Create a new URL for the PDF blob
      const url = URL.createObjectURL(pdf.pdf);
      setPdfUrl(url);
      setSelectedPDF(pdf);
      setError(null);
      
      // Don't reset drawing mode when opening a new PDF
      if (drawingMode) {
        clearDrawing();
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      setError('Failed to open PDF. Please try again.');
    }
  };

  const handleClose = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setSelectedPDF(null);
  };

  const handleDownload = async (id: string) => {
    try {
      console.log('Downloading PDF:', id);
      const pdf = await getPDF(id);
      if (pdf) {
        const url = URL.createObjectURL(pdf.pdf);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdf.metadata.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        console.error('PDF not found:', id);
        setError('PDF not found. It may have been deleted.');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to download PDF. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      console.log('Deleting PDF:', id);
      await deletePDF(id);
      if (selectedPDF?.id === id) {
        handleClose();
      }
      await refreshPDFs();
    } catch (error) {
      console.error('Error deleting PDF:', error);
      setError('Failed to delete PDF. Please try again.');
    }
  };

  if (loading) {
    return <div className="stored-pdfs">Loading stored PDFs...</div>;
  }

  if (error) {
    return (
      <div className="stored-pdfs">
        <div className="error-message">{error}</div>
        <button onClick={refreshPDFs}>Retry</button>
      </div>
    );
  }

  return (
    <div className="stored-pdfs">
      <div className="stored-pdfs-header">
        <h3>Stored PDFs</h3>
        <button onClick={refreshPDFs} className="refresh-btn">Refresh</button>
      </div>
      
      <div className="stored-pdfs-container">
        {/* PDF List Panel */}
        <div className="pdf-list-panel">
          {pdfs.length === 0 ? (
            <p>No PDFs stored yet. Generate a PDF using the "Export to PDF" button above.</p>
          ) : (
            <div className="pdf-list">
              <div className="pdf-list-header">
                <button 
                  className={`sort-btn ${sortField === 'date' ? 'active' : ''}`}
                  onClick={() => handleSort('date')}
                >
                  Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-btn ${sortField === 'crewNumber' ? 'active' : ''}`}
                  onClick={() => handleSort('crewNumber')}
                >
                  Crew {sortField === 'crewNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-btn ${sortField === 'fireName' ? 'active' : ''}`}
                  onClick={() => handleSort('fireName')}
                >
                  Fire {sortField === 'fireName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-btn ${sortField === 'timestamp' ? 'active' : ''}`}
                  onClick={() => handleSort('timestamp')}
                >
                  Stored {sortField === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
              </div>
              {sortedPDFs.map((pdf) => (
                <div key={pdf.id} className={`pdf-item ${selectedPDF?.id === pdf.id ? 'selected' : ''}`}>
                  <div className="pdf-info">
                    <strong>{pdf.metadata.filename}</strong>
                    <div>Date: {pdf.metadata.date}</div>
                    <div>Crew: {pdf.metadata.crewNumber}</div>
                    <div>Fire: {pdf.metadata.fireName} ({pdf.metadata.fireNumber})</div>
                    <div>Stored: {new Date(pdf.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="pdf-actions">
                    <button onClick={() => handleOpen(pdf)} className="open-btn">
                      {selectedPDF?.id === pdf.id ? 'Viewing' : 'View'}
                    </button>
                    <button onClick={() => handleDownload(pdf.id)} className="download-btn">Download</button>
                    <button onClick={() => handleDelete(pdf.id)} className="delete-btn">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PDF Viewer Panel */}
        {selectedPDF && pdfUrl && (
          <div className="pdf-viewer-panel">
            <div className="pdf-viewer-header">
              <div className="pdf-viewer-title">
                <h4>{selectedPDF.metadata.filename}</h4>
              </div>
              <div className="pdf-viewer-actions">
                <button 
                  onClick={() => setDrawingMode(!drawingMode)} 
                  className={`draw-btn ${drawingMode ? 'active' : ''}`}
                >
                  {drawingMode ? 'Cancel Drawing' : 'Draw'}
                </button>
                {drawingMode && (
                  <>
                    <button onClick={clearDrawing} className="clear-btn">
                      Clear
                    </button>
                    <button onClick={saveDrawing} className="save-btn">
                      Save
                    </button>
                  </>
                )}
                <button onClick={handleClose} className="close-btn">Close</button>
              </div>
            </div>
            <div className="pdf-viewer-content" ref={pdfViewerRef}>
              <iframe
                src={pdfUrl}
                title={selectedPDF.metadata.filename}
                width="100%"
                height="100%"
                style={{ 
                  border: 'none',
                  display: drawingMode ? 'none' : 'block'
                }}
              />
              {drawingMode && (
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="drawing-canvas"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 