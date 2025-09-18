import React, { useState, useCallback, useRef, useEffect } from 'react';
import { processSVG } from './services/svgProcessor';
import { Explanation } from './components/Explanation';
import DotPreview from './components/DotPreview';

const App: React.FC = () => {
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
    const [svgFileName, setSvgFileName] = useState<string>('');
    
    // History state management for Undo/Redo
    const [history, setHistory] = useState<string[]>(['']);
    const [historyIndex, setHistoryIndex] = useState<number>(0);
    const coordinates = history[historyIndex] || '';

    const [epsilon, setEpsilon] = useState<number>(10);
    const [minDistance, setMinDistance] = useState<number>(0.5);
    const [shouldResize, setShouldResize] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [previewMode, setPreviewMode] = useState<'svg' | 'dots'>('svg');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to clean up object URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            if (backgroundImage) {
                URL.revokeObjectURL(backgroundImage);
            }
        };
    }, [backgroundImage]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset all content states on new file selection
        setSvgContent(null);
        if (backgroundImage) URL.revokeObjectURL(backgroundImage);
        setBackgroundImage(null);
        setImageDimensions(null);
        setHistory(['']);
        setHistoryIndex(0);
        setError(null);
        setSvgFileName(file.name);

        if (file.type === "image/svg+xml") {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setSvgContent(text);
                setPreviewMode('svg');
            };
            reader.readAsText(file);
        } else if (file.type === "image/png" || file.type === "image/jpeg") {
            const url = URL.createObjectURL(file);
            setBackgroundImage(url);
            
            const img = new Image();
            img.onload = () => {
                setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.src = url;

            setPreviewMode('dots'); // Switch to drawing mode
        } else {
            setError("Please select a valid SVG, PNG, or JPG file.");
            setSvgFileName('');
        }
    };

    const handleProcess = useCallback(async () => {
        if (!svgContent) {
            setError("No SVG file loaded.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setHistory(['']);
        setHistoryIndex(0);

        try {
            const result = await processSVG(svgContent, epsilon, shouldResize, minDistance);
            setHistory([result]);
            setHistoryIndex(0);
            if (result) {
                setPreviewMode('dots');
            }
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [svgContent, epsilon, shouldResize, minDistance]);

    const handleCopyToClipboard = () => {
        if (coordinates) {
            navigator.clipboard.writeText(coordinates);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };
    
    const handleCoordinatesUpdate = (newCoords: string) => {
        if (newCoords === coordinates) return;

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newCoords);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        if (newCoords.trim()) {
            setPreviewMode('dots');
        }
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
        }
    };


    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };
    
    const isSvgMode = svgContent !== null && backgroundImage === null;

    const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-lg font-semibold transition-colors duration-200 focus:outline-none ${
                active 
                ? 'text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-gray-400 hover:text-white border-b-2 border-transparent'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                        SVG Dot-to-Dot Generator
                    </h1>
                    <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                        Upload an SVG to generate coordinates, or upload an image to trace and create your own.
                    </p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Controls & Output */}
                    <div className="lg:col-span-1 bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 flex flex-col space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-4 text-white">1. Upload File</h2>
                             <input
                                type="file"
                                accept="image/svg+xml,image/png,image/jpeg"
                                onChange={handleFileChange}
                                className="hidden"
                                ref={fileInputRef}
                            />
                            <button
                                onClick={triggerFileSelect}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out flex items-center justify-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                {svgFileName ? `Loaded: ${svgFileName}` : 'Select SVG or Image'}
                            </button>
                        </div>
                        
                        <div className={`${!isSvgMode ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h2 className="text-2xl font-bold mb-2 text-white">2. Configure (SVG only)</h2>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="epsilon" className="block mb-2 font-medium text-gray-300">
                                        Simplification (Epsilon): {epsilon.toFixed(1)}
                                    </label>
                                    <input
                                        id="epsilon"
                                        type="range"
                                        min="0.1"
                                        max="50"
                                        step="0.1"
                                        value={epsilon}
                                        onChange={(e) => setEpsilon(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        disabled={!isSvgMode}
                                    />
                                    <p className="text-sm text-gray-500 mt-1">Higher values simplify more. Adjust for desired detail.</p>
                                </div>
                                <div>
                                    <label htmlFor="minDistance" className="block mb-2 font-medium text-gray-300">
                                        Duplicate Point Filter: {minDistance.toFixed(1)}
                                    </label>
                                    <input
                                        id="minDistance"
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={minDistance}
                                        onChange={(e) => setMinDistance(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        disabled={!isSvgMode}
                                    />
                                    <p className="text-sm text-gray-500 mt-1">Removes points closer than this distance. Set to 0 to disable.</p>
                                </div>
                                <div>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={shouldResize}
                                            onChange={(e) => setShouldResize(e.target.checked)}
                                            className="appearance-none h-5 w-5 border-2 border-gray-600 rounded-md bg-gray-700 checked:bg-cyan-500 checked:border-cyan-500 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500"
                                            disabled={!isSvgMode}
                                        />
                                        <span className="text-gray-300 font-medium">Resize canvas to 720x1080</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleProcess}
                            disabled={!isSvgMode || isLoading}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-4 px-4 rounded-lg transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : 'Generate Coordinates'}
                        </button>
                        {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">{error}</div>}
                        
                         {/* Output */}
                        <div className="flex-grow flex flex-col">
                            <h2 className="text-2xl font-bold mb-4 text-white">3. Output Coordinates</h2>
                            <div className="relative flex-grow">
                                <textarea
                                    className="bg-gray-900 text-yellow-300 p-4 rounded-lg text-sm overflow-auto h-full min-h-[15rem] w-full font-mono resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                    value={coordinates}
                                    onChange={(e) => handleCoordinatesUpdate(e.target.value)}
                                    placeholder="Your generated coordinates will appear here, or you can paste your own..."
                                    aria-label="Output Coordinates"
                                />
                                {coordinates && (
                                    <button
                                        onClick={handleCopyToClipboard}
                                        className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-md text-xs transition"
                                    >
                                        {isCopied ? 'Copied!' : 'Copy'}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Previews */}
                    <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 flex flex-col">
                        <div className="flex justify-between items-center border-b border-gray-700 mb-4">
                           <div className="flex">
                                <TabButton active={previewMode === 'svg'} onClick={() => setPreviewMode('svg')}>
                                    Original Preview
                                </TabButton>
                                 <TabButton active={previewMode === 'dots'} onClick={() => setPreviewMode('dots')}>
                                    Dot-to-Dot Preview
                                </TabButton>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleUndo}
                                    disabled={historyIndex === 0}
                                    className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Undo change"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" /></svg>
                                </button>
                                <button
                                    onClick={handleRedo}
                                    disabled={historyIndex >= history.length - 1}
                                    className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Redo change"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-4-4m4 4l-4 4" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex-grow bg-gray-900 p-4 rounded-lg border border-gray-600 flex items-center justify-center min-h-[28rem]">
                             {previewMode === 'svg' && (
                                <>
                                    {svgContent && (
                                         <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: svgContent }} />
                                    )}
                                    {backgroundImage && (
                                         <img src={backgroundImage} alt="Original Upload" className="max-w-full max-h-full object-contain" />
                                    )}
                                    {!svgContent && !backgroundImage && (
                                        <div className="text-gray-500">Upload an SVG or Image to see the preview.</div>
                                    )}
                                </>
                            )}
                             {previewMode === 'dots' && (
                                <DotPreview
                                    coordinates={coordinates}
                                    onUpdateCoordinates={handleCoordinatesUpdate}
                                    backgroundImage={backgroundImage}
                                    imageDimensions={imageDimensions}
                                />
                            )}
                        </div>
                    </div>
                </main>
                
                <Explanation />
            </div>
        </div>
    );
};

export default App;