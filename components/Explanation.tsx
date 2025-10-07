import React from 'react';

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold text-cyan-400 mb-3">{title}</h3>
        <div className="text-gray-300 space-y-3">{children}</div>
    </div>
);

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <code className="bg-gray-900 text-yellow-300 px-2 py-1 rounded-md text-sm">{children}</code>
);

export const Explanation: React.FC = () => {
    const exampleSVG = `<svg width="100" height="100">
  <rect x="10" y="10" width="80" height="80" />
</svg>`;
    const exampleJSON = `[
  [10,10],
  [90,10],
  [90,90],
  [10,90],
  [10,10,-1]
]`;

    return (
        <div className="mt-8 p-6 bg-gray-900 border border-gray-700 rounded-xl space-y-6">
            <h2 className="text-3xl font-bold text-center text-white mb-6">How It Works</h2>

            <Card title="1. SVG Parsing & Shape Extraction">
                <p>
                    When you upload an SVG file, the application first reads it as a text string. It then uses the browser's built-in <Code>DOMParser</Code> to convert this string into a structured SVG document model.
                </p>
                <p>
                    The tool scans this document for common geometric shape elements like <Code>&lt;path&gt;</Code>, <Code>&lt;rect&gt;</Code>, <Code>&lt;circle&gt;</Code>, <Code>&lt;polygon&gt;</Code>, etc. To create a consistent data format, all shapes are converted into an equivalent <Code>&lt;path&gt;</Code> data string. For example, a <Code>&lt;rect&gt;</Code> becomes a series of line-to commands defining its four corners.
                </p>
            </Card>

            <Card title="2. Point Selection & Simplification Algorithm">
                <p>
                    Once all shapes are represented as paths, the path data (the <Code>d</Code> attribute) is parsed. Curves, such as those defined by cubic Bézier commands (<Code>C</Code>), are subdivided into a series of straight line segments to approximate their shape.
                </p>
                <p>
                    The core of the optimization lies in the <strong>Ramer-Douglas-Peucker (RDP)</strong> algorithm. This algorithm intelligently simplifies a path by removing redundant points.
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>It starts with the first and last points of a path segment.</li>
                    <li>It finds the intermediate point that is farthest from the straight line connecting the start and end points.</li>
                    <li>If this farthest point is within a specified tolerance (which you can adjust with the "Simplification" slider), all intermediate points are discarded.</li>
                    <li>If the point is outside the tolerance, the path is split at that point, and the algorithm is applied recursively to the two new sub-paths.</li>
                </ul>
            </Card>

            <Card title="3. Preserving Geometry & Straight Lines">
                <p>
                    The RDP algorithm is particularly effective for long straight lines. All points along a straight segment lie very close to (or directly on) the line connecting its endpoints.
                </p>
                <p>
                    As a result, they fall well within the simplification tolerance and are removed, leaving only the two essential endpoints. This drastically reduces the number of coordinates needed to define the shape while perfectly preserving its geometry. Corners and significant bends are kept because points there will be far from the simplified line.
                </p>
            </Card>

            <Card title="4. Example: Simple Square">
                <div>
                    <p>Given this simple SVG for a square:</p>
                    <pre className="bg-gray-900 p-3 rounded-md text-sm mt-2"><code className="text-white">{exampleSVG}</code></pre>
                </div>
                <div>
                    <p>The tool generates the following compact coordinate list. The <Code>-1</Code> at the end indicates that the shape is closed, connecting the last point back to the first.</p>
                    <pre className="bg-gray-900 p-3 rounded-md text-sm mt-2"><code className="text-yellow-300">{exampleJSON}</code></pre>
                </div>
            </Card>
            
            <Card title="5. Scaling for Complex Shapes">
                 <p>
                    This tool is designed to handle complex SVGs containing multiple, disconnected, or closed shapes. Each shape is processed independently and presented as a separate block of coordinates.
                 </p>
                 <p>
                    For highly detailed or complex drawings, the <strong>Simplification</strong> slider is your most important control. A lower value preserves more detail (more points), while a higher value increases simplification (fewer points). Experiment with it to find the best balance for your needs.
                 </p>
                 <p className="text-sm text-gray-400">
                    Note: The current implementation focuses on geometric primitives. Advanced SVG features like gradients, filters, text elements, or complex transforms might not be fully processed.
                 </p>
            </Card>

            <Card title="6. Manual Input & Live Preview">
                 <p>
                    The "Output Coordinates" area is not just for display—it's interactive! You can manually edit, paste, or type your own coordinate sets directly into the text area.
                 </p>
                 <p>
                    As you modify the coordinates, the <strong>Dot-to-Dot Preview</strong> will update in real-time, allowing you to visualize your changes instantly. This makes it a powerful tool for experimenting with and fine-tuning vector data.
                 </p>
            </Card>
        </div>
    );
};