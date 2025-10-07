import React, { useMemo, useState, useRef, MouseEvent } from 'react';

interface DotPreviewProps {
    coordinates: string;
    onUpdateCoordinates: (newCoordinates: string) => void;
    backgroundImage: string | null;
    imageDimensions: { width: number; height: number } | null;
}

type Shape = {
    points: [number, number][];
    isClosed: boolean;
};

// Helper to convert the internal shapes array back to the string format
const shapesToString = (shapes: Shape[]): string => {
    return shapes.map(shape => {
        if (shape.points.length === 0) return '';
        const pointsStr = shape.points.map((p, i) => {
            const isLastPoint = i === shape.points.length - 1;
            const x = parseFloat(p[0].toFixed(2));
            const y = parseFloat(p[1].toFixed(2));
            if (isLastPoint && shape.isClosed) {
                return `[${x},${y},-1]`;
            }
            return `[${x},${y}]`;
        }).join(',\n');
        
        if (!pointsStr) return '';
        return `[\n${pointsStr}\n]`;
    }).filter(s => s).join('\n\n');
};


const DotPreview: React.FC<DotPreviewProps> = ({ coordinates, onUpdateCoordinates, backgroundImage, imageDimensions }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [draggedPointInfo, setDraggedPointInfo] = useState<{ shapeIndex: number; pointIndex: number } | null>(null);

    const shapes = useMemo(() => {
        const newShapes: Shape[] = [];
        if (!coordinates.trim()) {
            return newShapes;
        }
        
        // Normalize line endings to handle different OS formats (\r\n vs \n) before splitting.
        const normalizedCoordinates = coordinates.replace(/\r\n/g, '\n');
        // Primary separator: blank lines. Each block can contain multiple shapes.
        const shapeBlocks = normalizedCoordinates.trim().split(/\n\s*\n/);

        for (const block of shapeBlocks) {
            if (!block.trim()) continue;

            // Use a more robust regex-based parser instead of JSON.parse
            // to handle malformed text and the `-1` separator logic.
            const coordRegex = /\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*(?:,\s*(-1)\s*)?\]/g;
            
            let currentShape: Shape = { points: [], isClosed: false };
            let match;

            // Find all coordinate pairs in the current block of text
            while ((match = coordRegex.exec(block)) !== null) {
                // We have a valid coordinate match
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                const isSeparator = match[3] === '-1';

                currentShape.points.push([x, y]);

                if (isSeparator) {
                    // The `-1` indicates the end of the current shape.
                    // Mark it as closed.
                    currentShape.isClosed = true;
                    
                    // Add the completed shape to our list.
                    if (currentShape.points.length > 0) {
                        newShapes.push(currentShape);
                    }
                    
                    // Start a new shape for any subsequent points.
                    currentShape = { points: [], isClosed: false };
                }
            }

            // After the loop, if there's a pending shape (that didn't end with -1), add it.
            if (currentShape.points.length > 0) {
                newShapes.push(currentShape);
            }
        }

        return newShapes;
    }, [coordinates]);


    const viewBox = useMemo(() => {
        if (imageDimensions) {
            return `0 0 ${imageDimensions.width} ${imageDimensions.height}`;
        }

        if (shapes.length === 0) {
            return '0 0 100 100';
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        shapes.forEach(shape => {
            shape.points.forEach(([x, y]) => {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            });
        });

        if (minX === Infinity || (minX === maxX && minY === maxY)) {
            const x = minX === Infinity ? 50 : minX;
            const y = minY === Infinity ? 50 : minY;
            return `${x-50} ${y-50} 100 100`;
        }

        const padding = (maxX - minX + maxY - minY) * 0.05;
        const width = (maxX - minX) + padding * 2;
        const height = (maxY - minY) + padding * 2;
        
        return `${minX - padding} ${minY - padding} ${width} ${height}`;
    }, [shapes, imageDimensions]);

    const strokeWidth = useMemo(() => {
        const [, , vbWidth] = (viewBox.split(' ').map(parseFloat));
        return (vbWidth || 100) / 200;
    }, [viewBox]);
    
    const handleCanvasClick = (event: MouseEvent<SVGSVGElement>) => {
        if (!backgroundImage || !svgRef.current || (event.target as SVGElement).tagName === 'circle') {
            return; // Only allow drawing on background image, and not when clicking an existing point
        }

        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;

        const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        const newPoint: [number, number] = [svgPoint.x, svgPoint.y];

        const newShapes: Shape[] = JSON.parse(JSON.stringify(shapes));

        if (newShapes.length === 0 || newShapes[newShapes.length - 1].isClosed) {
            newShapes.push({ points: [newPoint], isClosed: false });
        } else {
            newShapes[newShapes.length - 1].points.push(newPoint);
        }

        onUpdateCoordinates(shapesToString(newShapes));
    };

    const handleDeletePoint = (event: MouseEvent, shapeIndex: number, pointIndex: number) => {
        event.preventDefault();
        const newShapes: Shape[] = JSON.parse(JSON.stringify(shapes));
        
        const shape = newShapes[shapeIndex];
        shape.points.splice(pointIndex, 1);

        // If the shape has no points left, remove the shape itself
        if (shape.points.length === 0) {
            newShapes.splice(shapeIndex, 1);
        }

        onUpdateCoordinates(shapesToString(newShapes));
    };

    const handleMouseDown = (shapeIndex: number, pointIndex: number) => {
        setDraggedPointInfo({ shapeIndex, pointIndex });
    };

    const handleMouseUp = () => {
        setDraggedPointInfo(null);
    };

    const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
        if (!draggedPointInfo || !svgRef.current) return;

        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;

        const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        
        const { shapeIndex, pointIndex } = draggedPointInfo;

        const newShapes = JSON.parse(JSON.stringify(shapes)); // Deep copy to avoid mutation
        newShapes[shapeIndex].points[pointIndex] = [svgPoint.x, svgPoint.y];

        onUpdateCoordinates(shapesToString(newShapes));
    };

    if (shapes.length === 0 && !backgroundImage) {
        return <div className="flex items-center justify-center h-full text-gray-500">No data to preview. Generate or draw coordinates.</div>;
    }

    return (
        <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
            style={{ cursor: backgroundImage ? 'crosshair' : 'default' }}
        >
            {backgroundImage && imageDimensions && (
                <image
                    href={backgroundImage}
                    x="0"
                    y="0"
                    width={imageDimensions.width}
                    height={imageDimensions.height}
                    opacity="0.5"
                />
            )}
            {shapes.map((shape, shapeIndex) => (
                <g key={shapeIndex}>
                    <polyline
                        points={shape.points.map(p => p.join(',')).join(' ')}
                        fill="none"
                        stroke="rgba(110, 231, 183, 0.7)"
                        strokeWidth={strokeWidth}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                     {shape.isClosed && shape.points.length > 1 && (
                         <line
                            x1={shape.points[shape.points.length - 1][0]}
                            y1={shape.points[shape.points.length - 1][1]}
                            x2={shape.points[0][0]}
                            y2={shape.points[0][1]}
                            stroke="rgba(110, 231, 183, 0.7)"
                            strokeWidth={strokeWidth}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                         />
                    )}
                    {shape.points.map(([x, y], pointIndex) => (
                        <circle
                            key={`${shapeIndex}-${pointIndex}`}
                            cx={x}
                            cy={y}
                            r={strokeWidth * 1.5}
                            fill="#f59e0b"
                            onMouseDown={(e) => {
                                e.stopPropagation(); // Prevent canvas click when dragging a point
                                handleMouseDown(shapeIndex, pointIndex);
                            }}
                            onContextMenu={(e) => handleDeletePoint(e, shapeIndex, pointIndex)}
                            style={{ cursor: 'move' }}
                        >
                           <title>Drag to move | Right-click to delete</title>
                        </circle>
                    ))}
                </g>
            ))}
        </svg>
    );
};

export default DotPreview;
