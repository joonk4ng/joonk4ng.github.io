import React, { useEffect, useRef, useState } from 'react';
import '../styles/SignatureCanvas.css';

interface Point {
  x: number;
  y: number;
}

interface SignatureCanvasProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
  lineColor?: string;
  lineWidth?: number;
  showGuideLine?: boolean;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSave,
  onCancel,
  width = 800,
  height = 200,
  lineColor = '#000000',
  lineWidth = 2,
  showGuideLine = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPoint = useRef<Point | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set up high DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Scale context for high DPI display
    context.scale(dpr, dpr);
    
    // Set up context properties
    context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    // Draw guide line
    if (showGuideLine) {
      drawGuideLine(context);
    }
  }, [width, height, lineColor, lineWidth, showGuideLine]);

  const drawGuideLine = (context: CanvasRenderingContext2D) => {
    const y = height * 0.7; // Position guide line at 70% of height
    context.save();
    context.strokeStyle = '#CCCCCC';
    context.lineWidth = 1;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
    context.restore();
  };

  const getEventPoint = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ): Point => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in event) {
      const touch = event.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    event.preventDefault();
    setIsDrawing(true);
    
    const point = getEventPoint(event, canvasRef.current);
    lastPoint.current = point;
    
    const context = contextRef.current;
    if (context) {
      context.beginPath();
      context.moveTo(point.x, point.y);
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !contextRef.current || !lastPoint.current) return;
    
    event.preventDefault();
    const point = getEventPoint(event, canvasRef.current);
    
    // Smooth line drawing using quadratic curves
    const context = contextRef.current;
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    
    const midPoint = {
      x: (lastPoint.current.x + point.x) / 2,
      y: (lastPoint.current.y + point.y) / 2,
    };
    
    context.quadraticCurveTo(
      lastPoint.current.x,
      lastPoint.current.y,
      midPoint.x,
      midPoint.y
    );
    
    context.stroke();
    lastPoint.current = point;
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    
    if (!canvas || !context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (showGuideLine) {
      drawGuideLine(context);
    }
    setHasSignature(false);
  };

  const save = () => {
    if (!canvasRef.current || !hasSignature) return;
    
    // Add metadata to the signature
    const timestamp = new Date().toISOString();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      context.font = '10px Arial';
      context.fillStyle = '#999999';
      context.fillText(`Signed: ${timestamp}`, 5, height - 5);
    }
    
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div className="signature-canvas-container">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="signature-canvas"
      />
      <div className="signature-canvas-actions">
        <button
          onClick={clear}
          className="signature-button clear-button"
          type="button"
        >
          Clear
        </button>
        <button
          onClick={save}
          className="signature-button save-button"
          type="button"
          disabled={!hasSignature}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="signature-button cancel-button"
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}; 