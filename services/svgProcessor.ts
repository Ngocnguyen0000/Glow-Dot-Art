import { Point } from '../types';

// --- Ramer-Douglas-Peucker Algorithm ---

function getPerpendicularDistance(pt: Point, lineStart: Point, lineEnd: Point): number {
    let dx = lineEnd[0] - lineStart[0];
    let dy = lineEnd[1] - lineStart[1];

    if (dx === 0 && dy === 0) {
        dx = pt[0] - lineStart[0];
        dy = pt[1] - lineStart[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    const t = ((pt[0] - lineStart[0]) * dx + (pt[1] - lineStart[1]) * dy) / (dx * dx + dy * dy);
    let nearestPoint: Point;
    if (t < 0) {
        nearestPoint = lineStart;
    } else if (t > 1) {
        nearestPoint = lineEnd;
    } else {
        nearestPoint = [lineStart[0] + t * dx, lineStart[1] + t * dy];
    }

    dx = pt[0] - nearestPoint[0];
    dy = pt[1] - nearestPoint[1];
    return Math.sqrt(dx * dx + dy * dy);
}

function ramerDouglasPeucker(points: Point[], epsilon: number): Point[] {
    if (points.length < 3) {
        return points;
    }

    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
        const d = getPerpendicularDistance(points[i], points[0], points[end]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }

    if (dmax > epsilon) {
        const recResults1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
        const recResults2 = ramerDouglasPeucker(points.slice(index, points.length), epsilon);
        return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
    } else {
        return [points[0], points[points.length - 1]];
    }
}


// --- SVG Path Parsing and Shape Conversion ---

function parsePathData(d: string): Point[][] {
    if (!d) return [];

    const commands = d.match(/[a-df-z][^a-df-z]*/ig) || [];
    const paths: Point[][] = [];
    let currentPath: Point[] = [];
    let x = 0, y = 0;
    let startX = 0, startY = 0;

    // FIX: Explicitly type commandStr as string to fix type inference issue.
    commands.forEach((commandStr: string) => {
        const command = commandStr[0];
        const args = (commandStr.slice(1).trim().match(/[-.0-9]+/g) || []).map(parseFloat);
        
        const isRelative = command === command.toLowerCase();

        switch(command.toUpperCase()) {
            case 'M': // moveto
                for (let i = 0; i < args.length; i += 2) {
                    const px = isRelative ? x + args[i] : args[i];
                    const py = isRelative ? y + args[i+1] : args[i+1];
                    if (i === 0) {
                        if (currentPath.length > 0) {
                            paths.push(currentPath);
                        }
                        currentPath = [[px, py]];
                        startX = px;
                        startY = py;
                    } else {
                         currentPath.push([px, py]);
                    }
                    x = px;
                    y = py;
                }
                break;
            case 'L': // lineto
                for (let i = 0; i < args.length; i += 2) {
                    const px = isRelative ? x + args[i] : args[i];
                    const py = isRelative ? y + args[i+1] : args[i+1];
                    currentPath.push([px, py]);
                    x = px;
                    y = py;
                }
                break;
             case 'H': // horizontal lineto
                for (let i = 0; i < args.length; i++) {
                    const px = isRelative ? x + args[i] : args[i];
                    currentPath.push([px, y]);
                    x = px;
                }
                break;
            case 'V': // vertical lineto
                for (let i = 0; i < args.length; i++) {
                    const py = isRelative ? y + args[i] : args[i];
                    currentPath.push([x, py]);
                    y = py;
                }
                break;
            case 'C': // curveto
                for (let i = 0; i < args.length; i += 6) {
                    const x1 = isRelative ? x + args[i] : args[i];
                    const y1 = isRelative ? y + args[i+1] : args[i+1];
                    const x2 = isRelative ? x + args[i+2] : args[i+2];
                    const y2 = isRelative ? y + args[i+3] : args[i+3];
                    const endX = isRelative ? x + args[i+4] : args[i+4];
                    const endY = isRelative ? y + args[i+5] : args[i+5];

                    const steps = 10; // Subdivide curve
                    for (let t_step = 1; t_step <= steps; t_step++) {
                        const t = t_step / steps;
                        const it = 1 - t;
                        const b1 = it * it * it;
                        const b2 = 3 * it * it * t;
                        const b3 = 3 * it * t * t;
                        const b4 = t * t * t;
                        const px = b1 * x + b2 * x1 + b3 * x2 + b4 * endX;
                        const py = b1 * y + b2 * y1 + b3 * y2 + b4 * endY;
                        currentPath.push([px, py]);
                    }
                    x = endX;
                    y = endY;
                }
                break;
            case 'Z': // closepath
                if (currentPath.length > 0) {
                    currentPath.push([startX, startY]);
                    paths.push(currentPath);
                    currentPath = [];
                }
                break;
            default:
                // Other commands like S, Q, T, A are not implemented for simplicity
                break;
        }
    });

    if (currentPath.length > 0) {
        paths.push(currentPath);
    }
    
    return paths;
}

function shapeToPath(el: Element): {d: string, isClosed: boolean} {
    let d = '';
    let isClosed = false;
    const get = (attr: string) => parseFloat(el.getAttribute(attr) || '0');

    switch (el.tagName.toLowerCase()) {
        case 'path':
            d = el.getAttribute('d') || '';
            isClosed = d.toLowerCase().includes('z');
            break;
        case 'rect':
            const x = get('x'), y = get('y'), w = get('width'), h = get('height');
            d = `M ${x} ${y} H ${x+w} V ${y+h} H ${x} Z`;
            isClosed = true;
            break;
        case 'circle':
            const cx = get('cx'), cy = get('cy'), r = get('r');
            d = `M ${cx-r} ${cy} A ${r} ${r} 0 1 0 ${cx+r} ${cy} A ${r} ${r} 0 1 0 ${cx-r} ${cy} Z`;
            isClosed = true;
            break;
        case 'ellipse':
            const ecx = get('cx'), ecy = get('cy'), rx = get('rx'), ry = get('ry');
            d = `M ${ecx-rx} ${ecy} A ${rx} ${ry} 0 1 0 ${ecx+rx} ${ecy} A ${rx} ${ry} 0 1 0 ${ecx-rx} ${ecy} Z`;
            isClosed = true;
            break;
        case 'line':
            const x1 = get('x1'), y1 = get('y1'), x2 = get('x2'), y2 = get('y2');
            d = `M ${x1} ${y1} L ${x2} ${y2}`;
            break;
        case 'polyline':
            const polylinePoints = el.getAttribute('points')?.trim() || '';
            d = `M ${polylinePoints.replace(/\s+/g, ' L ')}`;
            break;
        case 'polygon':
            const polygonPoints = el.getAttribute('points')?.trim() || '';
            d = `M ${polygonPoints.replace(/\s+/g, ' L ')} Z`;
            isClosed = true;
            break;
    }
    return {d, isClosed};
}


// --- Main Processing Function ---

export async function processSVG(svgText: string, epsilon: number, shouldResize: boolean, minDistance: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");

        const parserError = doc.querySelector("parsererror");
        if (parserError) {
            return reject(new Error("Failed to parse SVG file."));
        }
        
        const svgEl = doc.documentElement;
        if (!svgEl) {
            return reject(new Error("Invalid SVG file: missing root <svg> element."));
        }

        // --- Resizing Logic ---
        let scale = 1, translateX = 0, translateY = 0, originX = 0, originY = 0;
        let svgWidth = 0, svgHeight = 0;
        
        const viewBox = svgEl.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox.split(/[\s,]+/).map(parseFloat);
            if(parts.length === 4) {
              originX = parts[0];
              originY = parts[1];
              svgWidth = parts[2];
              svgHeight = parts[3];
            }
        } 
        
        if (svgWidth === 0 || svgHeight === 0) {
            svgWidth = parseFloat(svgEl.getAttribute('width') || '0');
            svgHeight = parseFloat(svgEl.getAttribute('height') || '0');
        }
        
        if (shouldResize && svgWidth > 0 && svgHeight > 0) {
            const targetWidth = 720;
            const targetHeight = 1080;
            const scaleX = targetWidth / svgWidth;
            const scaleY = targetHeight / svgHeight;
            scale = Math.min(scaleX, scaleY);

            const newWidth = svgWidth * scale;
            const newHeight = svgHeight * scale;

            translateX = (targetWidth - newWidth) / 2;
            translateY = (targetHeight - newHeight) / 2;
        }


        const elements = doc.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon');
        if (elements.length === 0) {
            return reject(new Error("No valid shapes found in the SVG."));
        }

        const allShapesCoords: string[] = [];

        elements.forEach(el => {
            // Check if the element is a rectangle that acts as a frame/background and skip it
            if (el.tagName.toLowerCase() === 'rect') {
                const wAttr = el.getAttribute('width');
                const hAttr = el.getAttribute('height');

                // Case 1: Rect is 100% width/height, a common background pattern
                if (wAttr === '100%' && hAttr === '100%') {
                    return; // Skip this background rect
                }

                // Case 2: Rect's absolute dimensions match the SVG's canvas dimensions
                if (svgWidth > 0 && svgHeight > 0) {
                     const x = parseFloat(el.getAttribute('x') || '0');
                     const y = parseFloat(el.getAttribute('y') || '0');
                     const w = parseFloat(wAttr || '0');
                     const h = parseFloat(hAttr || '0');
                     
                     // Check with a small tolerance to account for minor imprecisions
                     if (
                         Math.abs(x - originX) <= 1 &&
                         Math.abs(y - originY) <= 1 &&
                         Math.abs(w - svgWidth) <= 1 &&
                         Math.abs(h - svgHeight) <= 1
                     ) {
                         return; // Skip this background rect
                     }
                }
            }

            const { d, isClosed } = shapeToPath(el as Element);
            const subPaths = parsePathData(d);

            subPaths.forEach(pathPoints => {
                if(pathPoints.length < 2) return;
                
                const transformedPoints = shouldResize
                    ? pathPoints.map(p => {
                        const newX = (p[0] - originX) * scale + translateX;
                        const newY = (p[1] - originY) * scale + translateY;
                        return [newX, newY] as Point;
                    })
                    : pathPoints;

                const simplified = ramerDouglasPeucker(transformedPoints, epsilon);
                if (simplified.length < 2) return;
                
                // Filter out points that are too close to the previous one
                let finalPoints: Point[] = simplified;
                if (minDistance > 0 && simplified.length > 0) {
                    const filteredPoints: Point[] = [simplified[0]];
                    const minDistanceSq = minDistance * minDistance; // Use squared distance for efficiency
                    for (let i = 1; i < simplified.length; i++) {
                        const lastPoint = filteredPoints[filteredPoints.length - 1];
                        const currentPoint = simplified[i];
                        const dx = currentPoint[0] - lastPoint[0];
                        const dy = currentPoint[1] - lastPoint[1];
                        if ((dx * dx + dy * dy) > minDistanceSq) {
                            filteredPoints.push(currentPoint);
                        }
                    }
                    finalPoints = filteredPoints;
                }

                if (finalPoints.length < 2) return;
                
                // Determine if the shape is closed based on the original simplified path
                // to preserve the original intent before points were filtered.
                let isPathClosed = isClosed;
                if (!isPathClosed) {
                    const first = simplified[0];
                    const last = simplified[simplified.length - 1];
                    if (Math.abs(first[0] - last[0]) < 0.1 && Math.abs(first[1] - last[1]) < 0.1) {
                       isPathClosed = true;
                    }
                }
                
                let coordsStr = finalPoints.map((p, i) => {
                    const isLastPoint = i === finalPoints.length - 1;
                    const x = parseFloat(p[0].toFixed(2));
                    const y = parseFloat(p[1].toFixed(2));
                    if(isLastPoint && isPathClosed) {
                        return `[${x},${y},-1]`;
                    }
                    return `[${x},${y}]`;
                }).join(',\n');
                
                allShapesCoords.push(coordsStr);
            });
        });

        if (allShapesCoords.length === 0) {
            return reject(new Error("Could not extract any processable coordinates from the SVG's shapes."));
        }
        
        resolve(allShapesCoords.join('\n\n'));
    });
}