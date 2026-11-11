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