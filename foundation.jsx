const FoundationDrawing = () => {
  const { useState } = React;
  const [config, setConfig] = useState({
    width: 6000, // mm
    length: 8000, // mm
    depth: 1200, // mm
    wallThickness: 300, // mm
    rebarSpacing: 200, // mm
    rebarDiameter: 16, // mm
    coverConcrete: 50 // mm
  });

  const [view, setView] = useState('plan'); // plan, section, 3d

  const scale = 0.05; // pixels per mm for display

  const updateConfig = (key, value) => {
    let numValue = parseFloat(value) || 0;

    // Enforce limits to prevent performance issues
    const limits = {
      length: { min: 1000, max: 50000 },
      width: { min: 1000, max: 50000 },
      depth: { min: 200, max: 5000 },
      wallThickness: { min: 100, max: 1000 },
      rebarSpacing: { min: 100, max: 500 },
      rebarDiameter: { min: 6, max: 40 },
      coverConcrete: { min: 25, max: 100 }
    };

    if (limits[key]) {
      numValue = Math.max(limits[key].min, Math.min(limits[key].max, numValue));
    }

    setConfig(prev => ({ ...prev, [key]: numValue }));
  };

  // Calculate rebar positions
  // svgWidth corresponds to foundation length (X-axis in SVG)
  // svgHeight corresponds to foundation width (Y-axis in SVG)
  const calculateRebarGrid = (svgWidth, svgHeight, spacing, cover) => {
    const rebars = [];
    const startX = cover;
    const endX = svgWidth - cover;
    const startY = cover;
    const endY = svgHeight - cover;

    // Horizontal rebars (parallel to X-axis, varying in Y)
    for (let y = startY; y <= endY; y += spacing) {
      rebars.push({
        type: 'horizontal',
        x1: startX,
        y1: y,
        x2: endX,
        y2: y
      });
    }

    // Vertical rebars (parallel to Y-axis, varying in X)
    for (let x = startX; x <= endX; x += spacing) {
      rebars.push({
        type: 'vertical',
        x1: x,
        y1: startY,
        x2: x,
        y2: endY
      });
    }

    return rebars;
  };

  const renderPlanView = () => {
    const svgWidth = config.length * scale;
    const svgHeight = config.width * scale;
    const rebars = calculateRebarGrid(config.length, config.width, config.rebarSpacing, config.coverConcrete);

    return (
      <svg width={svgWidth + 300} height={svgHeight + 100} className="border border-gray-300">
        <defs>
          <pattern id="concrete" patternUnits="userSpaceOnUse" width="20" height="20">
            <circle cx="10" cy="10" r="1" fill="#ccc" />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
        </defs>

        <g transform="translate(50, 50)">
          {/* Outer foundation perimeter */}
          <rect
            x={0}
            y={0}
            width={config.length * scale}
            height={config.width * scale}
            fill="url(#concrete)"
            stroke="#333"
            strokeWidth="2"
          />

          {/* Inner foundation (if it's a strip foundation) */}
          <rect
            x={config.wallThickness * scale}
            y={config.wallThickness * scale}
            width={(config.length - 2 * config.wallThickness) * scale}
            height={(config.width - 2 * config.wallThickness) * scale}
            fill="none"
            stroke="#666"
            strokeWidth="1"
            strokeDasharray="5,5"
          />

          {/* Rebars */}
          {rebars.map((rebar, idx) => (
            <line
              key={idx}
              x1={rebar.x1 * scale}
              y1={rebar.y1 * scale}
              x2={rebar.x2 * scale}
              y2={rebar.y2 * scale}
              stroke="#d00"
              strokeWidth={config.rebarDiameter * scale * 0.3}
            />
          ))}

          {/* Rebar intersection points */}
          {rebars.filter(r => r.type === 'horizontal').map((h, hi) =>
            rebars.filter(r => r.type === 'vertical').map((v, vi) => (
              <circle
                key={`int-${hi}-${vi}`}
                cx={h.x1 * scale}
                cy={v.y1 * scale}
                r={config.rebarDiameter * scale * 0.5}
                fill="#b00"
              />
            ))
          )}

          {/* Dimension lines */}
          {/* Length dimension */}
          <line
            x1={0}
            y1={-30}
            x2={config.length * scale}
            y2={-30}
            stroke="#666"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
            markerStart="url(#arrowhead)"
          />
          <text
            x={(config.length * scale) / 2}
            y={-35}
            textAnchor="middle"
            fontSize="12"
            fill="#333"
          >
            {config.length} mm
          </text>

          {/* Width dimension */}
          <line
            x1={-30}
            y1={0}
            x2={-30}
            y2={config.width * scale}
            stroke="#666"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
            markerStart="url(#arrowhead)"
          />
          <text
            x={-35}
            y={(config.width * scale) / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#333"
            transform={`rotate(-90, -35, ${(config.width * scale) / 2})`}
          >
            {config.width} mm
          </text>

          {/* Legend */}
          <g transform={`translate(${config.length * scale + 20}, 0)`}>
            <text fontSize="14" fontWeight="bold" fill="#333">PLAN VIEW</text>
            <line x1="0" y1="30" x2="30" y2="30" stroke="#d00" strokeWidth="3" />
            <text x="35" y="35" fontSize="11" fill="#333">Rebar Ø{config.rebarDiameter}mm</text>
            <rect x="0" y="45" width="30" height="15" fill="url(#concrete)" stroke="#333" />
            <text x="35" y="57" fontSize="11" fill="#333">Concrete</text>
          </g>
        </g>
      </svg>
    );
  };

  const renderSectionView = () => {
    // Section cutout - show only a portion of the foundation
    const sectionWidth = Math.min(2000, config.length);
    const targetWidth = 250; // Target width in pixels
    const sectionScale = targetWidth / sectionWidth; // Calculate scale to achieve target width
    const svgWidth = sectionWidth * sectionScale;
    const svgHeight = config.depth * sectionScale;

    // Calculate rebars visible in this section
    const cover = config.coverConcrete;
    const sectionRebars = [];

    // Only show rebars within the section cutout (0 to sectionWidth)
    // Bottom layer (horizontal rebars running left-right)
    for (let x = cover; x <= sectionWidth - cover; x += config.rebarSpacing) {
      sectionRebars.push({
        x,
        y: config.depth - cover,
        layer: 'bottom',
        orientation: 'horizontal'
      });
    }

    // Top layer (horizontal rebars)
    for (let x = cover; x <= sectionWidth - cover; x += config.rebarSpacing) {
      sectionRebars.push({
        x,
        y: cover,
        layer: 'top',
        orientation: 'horizontal'
      });
    }

    // Vertical rebars (stirrups/ties shown in section)
    const stirrupSpacing = config.rebarSpacing * 2; // Less frequent
    for (let x = cover; x <= sectionWidth - cover; x += stirrupSpacing) {
      sectionRebars.push({
        x,
        y: config.depth / 2,
        layer: 'stirrup',
        orientation: 'vertical'
      });
    }

    return (
      <svg width={svgWidth + 350} height={svgHeight + 150} className="border border-gray-300">
        <defs>
          <pattern id="ground" patternUnits="userSpaceOnUse" width="15" height="15">
            <path d="M0,15 L15,0" stroke="#8b7355" strokeWidth="1" />
          </pattern>
          <pattern id="sectionHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#999" strokeWidth="1" />
          </pattern>
        </defs>

        <g transform="translate(150, 50)">
          {/* Ground below foundation */}
          <rect
            x={-20}
            y={svgHeight}
            width={svgWidth + 40}
            height={100}
            fill="url(#ground)"
          />

          {/* Main foundation concrete body */}
          <rect
            x={0}
            y={0}
            width={svgWidth}
            height={svgHeight}
            fill="#ddd"
            stroke="#333"
            strokeWidth="3"
          />

          {/* Section cut hatching on left edge */}
          <rect
            x={0}
            y={0}
            width={30}
            height={svgHeight}
            fill="url(#sectionHatch)"
          />

          {/* Section cut hatching on right edge */}
          <rect
            x={svgWidth - 30}
            y={0}
            width={30}
            height={svgHeight}
            fill="url(#sectionHatch)"
          />

          {/* Rebars in section */}
          {sectionRebars.map((rebar, idx) => {
            if (rebar.orientation === 'horizontal') {
              // Horizontal rebars shown as circles (cut view)
              return (
                <circle
                  key={idx}
                  cx={rebar.x * sectionScale}
                  cy={rebar.y * sectionScale}
                  r={config.rebarDiameter * sectionScale * 0.6}
                  fill={rebar.layer === 'bottom' ? '#d00' : '#f00'}
                  stroke="#800"
                  strokeWidth="1"
                />
              );
            } else {
              // Vertical rebars shown as vertical lines
              return (
                <line
                  key={idx}
                  x1={rebar.x * sectionScale}
                  y1={cover * sectionScale}
                  x2={rebar.x * sectionScale}
                  y2={(config.depth - cover) * sectionScale}
                  stroke="#d00"
                  strokeWidth={config.rebarDiameter * sectionScale * 0.4}
                />
              );
            }
          })}

          {/* Dimension lines */}
          <line
            x1={0}
            y1={svgHeight + 20}
            x2={svgWidth}
            y2={svgHeight + 20}
            stroke="#666"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
            markerStart="url(#arrowhead)"
          />
          <text
            x={svgWidth / 2}
            y={svgHeight + 35}
            textAnchor="middle"
            fontSize="12"
            fill="#333"
          >
            {sectionWidth} mm (section cutout)
          </text>

          <line
            x1={-30}
            y1={0}
            x2={-30}
            y2={svgHeight}
            stroke="#666"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
            markerStart="url(#arrowhead)"
          />
          <text
            x={-35}
            y={svgHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#333"
            transform={`rotate(-90, -35, ${svgHeight / 2})`}
          >
            {config.depth} mm
          </text>

          {/* Cover dimension */}
          <line
            x1={0}
            y1={svgHeight - cover * sectionScale}
            x2={cover * sectionScale}
            y2={svgHeight - cover * sectionScale}
            stroke="#00f"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          <line
            x1={cover * sectionScale}
            y1={svgHeight - cover * sectionScale}
            x2={cover * sectionScale}
            y2={svgHeight}
            stroke="#00f"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          <text
            x={cover * sectionScale / 2 - 5}
            y={svgHeight - 5}
            fontSize="10"
            fill="#00f"
          >
            {cover}
          </text>

          {/* Rebar callout annotation */}
          <g>
            {/* Callout circle with number */}
            <circle
              cx={-80}
              cy={svgHeight - cover * sectionScale}
              r={15}
              fill="none"
              stroke="#333"
              strokeWidth="2"
            />
            <text
              x={-80}
              y={svgHeight - cover * sectionScale + 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#333"
            >
              1
            </text>

            {/* Leader line to rebar */}
            <line
              x1={-65}
              y1={svgHeight - cover * sectionScale}
              x2={cover * sectionScale + config.rebarSpacing * sectionScale}
              y2={svgHeight - cover * sectionScale}
              stroke="#333"
              strokeWidth="1"
            />

            {/* Rebar specification text */}
            <text
              x={-55}
              y={svgHeight - cover * sectionScale - 10}
              fontSize="12"
              fontWeight="bold"
              fill="#333"
            >
              Ø{config.rebarDiameter}
            </text>
            <text
              x={-55}
              y={svgHeight - cover * sectionScale + 15}
              fontSize="10"
              fill="#333"
            >
              Bottom layer
            </text>
          </g>

          {/* Legend */}
          <g transform={`translate(${svgWidth + 20}, 0)`}>
            <text fontSize="14" fontWeight="bold" fill="#333">SECTION A-A</text>
            <circle cx="10" cy="30" r="5" fill="#d00" stroke="#800" />
            <text x="20" y="35" fontSize="11" fill="#333">Bottom rebar</text>
            <circle cx="10" cy="50" r="5" fill="#f00" stroke="#800" />
            <text x="20" y="55" fontSize="11" fill="#333">Top rebar</text>
            <rect x="0" y="65" width="15" height="15" fill="url(#sectionHatch)" stroke="#999" />
            <text x="20" y="77" fontSize="11" fill="#333">Section cut</text>
          </g>
        </g>
      </svg>
    );
  };

  return (
    <div className="w-full mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Foundation Technical Drawing</h1>
      
      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Length (mm)
          </label>
          <input
            type="number"
            min="1000"
            max="50000"
            step="100"
            value={config.length}
            onChange={(e) => updateConfig('length', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Width (mm)
          </label>
          <input
            type="number"
            min="1000"
            max="50000"
            step="100"
            value={config.width}
            onChange={(e) => updateConfig('width', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Depth (mm)
          </label>
          <input
            type="number"
            min="200"
            max="5000"
            step="50"
            value={config.depth}
            onChange={(e) => updateConfig('depth', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Wall Thickness (mm)
          </label>
          <input
            type="number"
            min="100"
            max="1000"
            step="10"
            value={config.wallThickness}
            onChange={(e) => updateConfig('wallThickness', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rebar Spacing (mm)
          </label>
          <input
            type="number"
            min="100"
            max="500"
            step="10"
            value={config.rebarSpacing}
            onChange={(e) => updateConfig('rebarSpacing', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rebar Ø (mm)
          </label>
          <input
            type="number"
            min="6"
            max="40"
            step="2"
            value={config.rebarDiameter}
            onChange={(e) => updateConfig('rebarDiameter', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Concrete Cover (mm)
          </label>
          <input
            type="number"
            min="25"
            max="100"
            step="5"
            value={config.coverConcrete}
            onChange={(e) => updateConfig('coverConcrete', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
      </div>

      {/* View selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('plan')}
          className={`px-4 py-2 rounded ${view === 'plan' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Plan View
        </button>
        <button
          onClick={() => setView('section')}
          className={`px-4 py-2 rounded ${view === 'section' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Section View
        </button>
      </div>

      {/* Drawing area */}
      <div className="bg-white p-4 rounded-lg shadow-lg overflow-auto">
        {view === 'plan' && renderPlanView()}
        {view === 'section' && renderSectionView()}
      </div>

      {/* Specifications */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold text-lg mb-2">Specifications</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div><strong>Foundation Volume:</strong> {((config.length * config.width * config.depth) / 1e9).toFixed(2)} m³</div>
          <div><strong>Rebar Count (Plan):</strong> {calculateRebarGrid(config.length, config.width, config.rebarSpacing, config.coverConcrete).length}</div>
          <div><strong>Total Rebar Length:</strong> {(calculateRebarGrid(config.length, config.width, config.rebarSpacing, config.coverConcrete).reduce((sum, r) => {
            const length = Math.sqrt(Math.pow(r.x2 - r.x1, 2) + Math.pow(r.y2 - r.y1, 2));
            return sum + length;
          }, 0) / 1000).toFixed(1)} m (per layer)</div>
        </div>
      </div>
    </div>
  );
};
