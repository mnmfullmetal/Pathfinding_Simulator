# Pathfinding Simulator

A browser-based visualisation tool for testing 2D grid pathfinding algorithms. The simulator provides a visual representation of node evaluation, raycasting, and path construction.

[Pathfinding Simulator](https://pathfinding-simulator.pages.dev/)

## Core Features

*   **Interactive Canvas:** Click and drag to draw or erase obstacles. Start and target nodes are freely movable.
*   **Grid Management:** Adjustable X/Y grid dimensions.
*   **Obstacle Generation:** Supports manual wall drawing and random obstacle scatter with adjustable density.
*   **Layout State:** Save and load up to three grid configurations via local storage.
*   **Playback Controls:** Real-time simulation execution with adjustable playback speed and pause functionality.
*   **Performance Metrics:** Tracks execution time (ms), total nodes evaluated, and final path length.

## Supported Algorithms

*   **A* (Octile Heuristic):** Standard heuristic-based search.
*   **Dijkstra:** Uniform cost search without heuristic optimisation.
*   **Bidirectional A*:** Simultaneous search originating from both start and target nodes.
*   **Jump Point Search (JPS):** Optimised A* for uniform cost grids, skipping symmetrical paths.
*   **Theta* (Any-Angle):** Line-of-sight pathfinding that bypasses intermediate grid cells to construct unconstrained vectors.
*   **Hierarchical Pathfinding A* (HPA*):** Macro-graph abstraction dividing the grid into configurable clusters to reduce the search space. Includes dynamic UI controls for cluster sizing.
*  **Greedy-Bug:** A custom hybrid algorithm combining directional raycasting, dynamic branching (blooming), and robotic "Bug" obstacle-hugging. It prioritises rapid straight-line speed, using decaying bloom radii to efficiently navigate corners, and falls back on perimeter wall-tracing only as an absolute last resort when trapped.

## Architecture

*   **Frontend:** Vanilla HTML, CSS, and JavaScript.
*   **Rendering:** HTML5 `<canvas>` API driven by a centralised visualisation loop (`requestAnimationFrame`).
*   **Module System:** ES6 Modules. Algorithms are isolated into individual files and injected via a `PathfinderRegistry`.

## Usage

**Web Access**
Open https://pathfinding-simulator.pages.dev/ in any modern browser to run the simulator immediately.

**Local Execution**
1.  Download or clone the repository.
2.  Open `index.html` in any modern web browser. No local server or build tools are required.
3.  Select an algorithm from the control panel, configure the grid, and initiate the simulation.

## Contributing

Contributions are strictly limited to the addition of new pathfinding algorithms (either standard or custom). Pull requests that alter the simulator's core UI layout, DOM structure, or rendering engine will be rejected. 

To contribute a new algorithm:

1. **Create the Logic File:** Add a new `.js` file to the `/algorithms` directory. 
2. **Register the Algorithm:** Use the `RegisterAlgorithm(id, name, runFunction)` module. Your `runFunction` must accept `(gridMap, startNode, targetNode, config)` and return `{ path: [], evaluated: [], raycasts: [], timeMs: float }`.
3. **Import the File:** Add the import statement to the top of `main.js`.
4. **Add the Encyclopedia Card:** Append your algorithm's documentation to the `algoData` dictionary in `main.js` using this exact strict format:
    ```javascript
    your_algo_id: {
        title: '<h1>ALGORITHM NAME</h1>',
        overview: 'Brief explanation of the core logic.',
        useCases: '<li>Case 1</li><li>Case 2</li><li>Case 3</li>',
        diagram: `
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-target">T</div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">f</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-start">S</div><div class="diag-wall"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
        `,
        legend: '<div><span class="box-start">S</span> Start</div><div><span class="box-target">T</span> Target</div><div><span class="box-eval"></span> Evaluated</div>',
        diagDesc: 'Explanation of the 6x5 grid representation.',
        scenarios: 
            createScenario('Open Terrain', 'Efficiency Rating', '#HexColor', 'Outcome description.') +
            createScenario('Cluttered Space', 'Efficiency Rating', '#HexColor', 'Outcome description.') +
            createScenario('Dead Ends', 'Efficiency Rating', '#HexColor', 'Outcome description.'),
        complexity: '<span>Time: O(...)</span> | <span>Space: O(...)</span>'
    }
    ```
5. **Update the UI Menu:** Add a list item to the `<ul class="ency-menu">` in `index.html` referencing your algorithm's ID: `<li data-algo="your_algo_id">Algorithm Name</li>`.