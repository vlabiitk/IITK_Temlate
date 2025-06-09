document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('plot-canvas');
    const ctx = canvas.getContext('2d');
    let width = canvas.width;
    let height = canvas.height;
      // Make canvas responsive
    function resizeCanvas() {
        const visualizationDiv = document.querySelector('.visualization');
        const maxWidth = visualizationDiv.clientWidth - 40; // Account for padding
        
        if (maxWidth < 600) {
            // Keep aspect ratio
            const ratio = canvas.height / canvas.width;
            canvas.width = maxWidth;
            canvas.height = maxWidth * ratio;
            width = canvas.width;
            height = canvas.height;
            
            // Redraw everything
            clearCanvas();
            if (points1.length > 0 || points2.length > 0) {
                drawPoints();
            }
        } else if (window.innerWidth >= 900 && canvas.width < 600) {
            // Reset to original size on larger screens
            canvas.width = 600;
            canvas.height = 600;
            width = canvas.width;
            height = canvas.height;
            
            // Redraw everything
            clearCanvas();
            if (points1.length > 0 || points2.length > 0) {
                drawPoints();
            }
        }
    }
    
    // Call resize on load and window resize
    resizeCanvas();
    window.addEventListener('resize', function() {
        // Debounce the resize event to prevent too many redraws
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(function() {
            resizeCanvas();
        }, 250);
    });
    
    // Button elements
    const generateBtn = document.getElementById('generate-btn');
    const markAllBtn = document.getElementById('mark-all-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    // Data storage
    let points1 = [];
    let points2 = [];
    let plotBounds = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
    
    // Input validation function
    function validateInputs() {
        const inputs = [
            'mean1x', 'mean1y', 'cov1xx', 'cov1xy', 'cov1yy', 'prior1',
            'mean2x', 'mean2y', 'cov2xx', 'cov2xy', 'cov2yy', 'prior2'
        ];
        
        let isValid = true;
        let errorMessage = "";
        
        // Check if all inputs are valid numbers
        for (const id of inputs) {
            const value = document.getElementById(id).value;
            if (isNaN(parseFloat(value))) {
                isValid = false;
                errorMessage = `${id} must be a valid number`;
                break;
            }
        }
        
        // Check if priors sum to 1
        if (isValid) {
            const prior1 = parseFloat(document.getElementById('prior1').value);
            const prior2 = parseFloat(document.getElementById('prior2').value);
            
            if (Math.abs(prior1 + prior2 - 1) > 0.001) {
                isValid = false;
                errorMessage = "Prior probabilities must sum to 1";
            }
        }
        
        // Check if covariance matrices are positive definite
        if (isValid) {
            const cov1xx = parseFloat(document.getElementById('cov1xx').value);
            const cov1xy = parseFloat(document.getElementById('cov1xy').value);
            const cov1yy = parseFloat(document.getElementById('cov1yy').value);
            
            const cov2xx = parseFloat(document.getElementById('cov2xx').value);
            const cov2xy = parseFloat(document.getElementById('cov2xy').value);
            const cov2yy = parseFloat(document.getElementById('cov2yy').value);
            
            // Check if matrices are positive definite
            if (cov1xx <= 0 || cov1yy <= 0 || cov1xx * cov1yy <= cov1xy * cov1xy) {
                isValid = false;
                errorMessage = "Covariance matrix for Class 1 is not positive definite";
            }
            
            if (cov2xx <= 0 || cov2yy <= 0 || cov2xx * cov2yy <= cov2xy * cov2xy) {
                isValid = false;
                errorMessage = "Covariance matrix for Class 2 is not positive definite";
            }
        }
        
        if (!isValid) {
            alert(errorMessage);
        }
        
        return isValid;
    }
    
    // Function to get parameters from inputs
    function getParams() {
        return {
            mean1: [parseFloat(document.getElementById('mean1x').value), parseFloat(document.getElementById('mean1y').value)],
            cov1: [
                [parseFloat(document.getElementById('cov1xx').value), parseFloat(document.getElementById('cov1xy').value)],
                [parseFloat(document.getElementById('cov1xy').value), parseFloat(document.getElementById('cov1yy').value)]
            ],
            prior1: parseFloat(document.getElementById('prior1').value),
            
            mean2: [parseFloat(document.getElementById('mean2x').value), parseFloat(document.getElementById('mean2y').value)],
            cov2: [
                [parseFloat(document.getElementById('cov2xx').value), parseFloat(document.getElementById('cov2xy').value)],
                [parseFloat(document.getElementById('cov2xy').value), parseFloat(document.getElementById('cov2yy').value)]
            ],
            prior2: parseFloat(document.getElementById('prior2').value)
        };
    }
    
    // Function to generate multivariate normal samples
    function generateMultivariateNormal(mean, cov, numSamples) {
        const samples = [];
        
        // Calculate Cholesky decomposition of covariance matrix
        const L = choleskyDecomposition(cov);
        
        for (let i = 0; i < numSamples; i++) {
            // Generate two independent standard normal variables
            const z1 = boxMullerTransform();
            const z2 = boxMullerTransform();
            
            // Apply transformation
            const x = mean[0] + L[0][0] * z1 + L[0][1] * z2;
            const y = mean[1] + L[1][0] * z1 + L[1][1] * z2;
            
            samples.push([x, y]);
        }
        
        return samples;
    }
    
    // Box-Muller transform for generating standard normal random variables
    function boxMullerTransform() {
        const u1 = Math.random();
        const u2 = Math.random();
        
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z;
    }
    
    // Cholesky decomposition of a 2x2 matrix
    function choleskyDecomposition(cov) {
        const L = [[0, 0], [0, 0]];
        
        L[0][0] = Math.sqrt(cov[0][0]);
        L[0][1] = 0;
        L[1][0] = cov[0][1] / L[0][0];
        L[1][1] = Math.sqrt(cov[1][1] - L[1][0] * L[1][0]);
        
        return L;
    }
      // Function to map data coordinates to canvas coordinates
    function mapToCanvas(x, y) {
        const xRange = plotBounds.xMax - plotBounds.xMin;
        const yRange = plotBounds.yMax - plotBounds.yMin;
        
        const xCanvas = ((x - plotBounds.xMin) / xRange) * width;
        const yCanvas = height - ((y - plotBounds.yMin) / yRange) * height;
        
        return [xCanvas, yCanvas];
    }
    
    // Function to map canvas coordinates to data coordinates
    function mapFromCanvas(xCanvas, yCanvas) {
        const xRange = plotBounds.xMax - plotBounds.xMin;
        const yRange = plotBounds.yMax - plotBounds.yMin;
        
        const x = plotBounds.xMin + (xCanvas / width) * xRange;
        const y = plotBounds.yMin + ((height - yCanvas) / height) * yRange;
        
        return [x, y];
    }
      // Function to clear the canvas
    function clearCanvas() {
        ctx.clearRect(0, 0, width, height);
        drawAxes();
    }
    
    // Function to draw the x and y axes
    function drawAxes() {
        ctx.strokeStyle = "#999";
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // Draw x-axis
        const [x0, yAxis] = mapToCanvas(0, 0);
        const [xWidth, _] = mapToCanvas(plotBounds.xMax, 0);
        ctx.moveTo(0, yAxis);
        ctx.lineTo(width, yAxis);
        
        // Draw y-axis
        const [xAxis, y0] = mapToCanvas(0, 0);
        const [__, yHeight] = mapToCanvas(0, plotBounds.yMax);
        ctx.moveTo(xAxis, 0);
        ctx.lineTo(xAxis, height);
        
        ctx.stroke();
        
        // Draw tick marks and labels
        ctx.font = '10px Arial';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        
        // X-axis ticks
        for (let x = Math.ceil(plotBounds.xMin); x <= Math.floor(plotBounds.xMax); x++) {
            if (x === 0) continue; // Skip the origin
            const [xPos, yPos] = mapToCanvas(x, 0);
            ctx.beginPath();
            ctx.moveTo(xPos, yAxis - 3);
            ctx.lineTo(xPos, yAxis + 3);
            ctx.stroke();
            ctx.fillText(x.toString(), xPos, yAxis + 15);
        }
        
        // Y-axis ticks
        ctx.textAlign = 'right';
        for (let y = Math.ceil(plotBounds.yMin); y <= Math.floor(plotBounds.yMax); y++) {
            if (y === 0) continue; // Skip the origin
            const [xPos, yPos] = mapToCanvas(0, y);
            ctx.beginPath();
            ctx.moveTo(xAxis - 3, yPos);
            ctx.lineTo(xAxis + 3, yPos);
            ctx.stroke();
            ctx.fillText(y.toString(), xAxis - 5, yPos + 4);
        }
        
        // Origin label
        ctx.textAlign = 'right';
        ctx.fillText('0', xAxis - 5, yAxis + 15);
    }
    
    // Function to draw data points
    function drawPoints() {
        // Draw class 1 points
        ctx.fillStyle = 'rgba(30, 144, 255, 0.7)';
        for (const point of points1) {
            const [x, y] = mapToCanvas(point[0], point[1]);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw class 2 points
        ctx.fillStyle = 'rgba(220, 20, 60, 0.7)';
        for (const point of points2) {
            const [x, y] = mapToCanvas(point[0], point[1]);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Function to calculate multivariate normal density
    function mvnPDF(x, mean, cov) {
        const dim = 2;
        const dx = [x[0] - mean[0], x[1] - mean[1]];
        
        // Calculate inverse of covariance matrix
        const det = cov[0][0] * cov[1][1] - cov[0][1] * cov[1][0];
        const invCov = [
            [cov[1][1] / det, -cov[0][1] / det],
            [-cov[1][0] / det, cov[0][0] / det]
        ];
        
        // Calculate exponent term: -0.5 * (x-μ)^T * Σ^(-1) * (x-μ)
        let exponent = 0;
        for (let i = 0; i < dim; i++) {
            for (let j = 0; j < dim; j++) {
                exponent += dx[i] * invCov[i][j] * dx[j];
            }
        }
        exponent *= -0.5;
        
        // Calculate coefficient: 1 / (sqrt((2π)^n * |Σ|))
        const coefficient = 1 / (Math.sqrt(Math.pow(2 * Math.PI, dim) * det));
        
        return coefficient * Math.exp(exponent);
    }
    
    // Function to visualize density functions
    function visualizeDensities() {
        if (!validateInputs()) return;
        
        const params = getParams();
        clearCanvas();
        drawPoints();
        
        // Create density heatmap
        const resolution = 50;
        const xStep = (plotBounds.xMax - plotBounds.xMin) / resolution;
        const yStep = (plotBounds.yMax - plotBounds.yMin) / resolution;
        
        // Calculate max density for normalization
        let maxDensity1 = 0;
        let maxDensity2 = 0;
        
        // Pre-compute densities
        const densities1 = [];
        const densities2 = [];
        
        for (let i = 0; i < resolution; i++) {
            densities1.push([]);
            densities2.push([]);
            
            const x = plotBounds.xMin + i * xStep;
            
            for (let j = 0; j < resolution; j++) {
                const y = plotBounds.yMin + j * yStep;
                
                const density1 = mvnPDF([x, y], params.mean1, params.cov1);
                const density2 = mvnPDF([x, y], params.mean2, params.cov2);
                
                densities1[i].push(density1);
                densities2[i].push(density2);
                
                maxDensity1 = Math.max(maxDensity1, density1);
                maxDensity2 = Math.max(maxDensity2, density2);
            }
        }
        
        // Draw density contours
        const numContours = 5;
        const contourLevels = [];
        
        for (let i = 1; i <= numContours; i++) {
            contourLevels.push(i / (numContours + 1));
        }
        
        // Draw Class 1 contours
        ctx.strokeStyle = 'rgba(30, 144, 255, 0.8)';
        ctx.lineWidth = 2;
        
        for (const level of contourLevels) {
            const threshold = maxDensity1 * level;
            drawContour(densities1, threshold, 'blue');
        }
        
        // Draw Class 2 contours
        ctx.strokeStyle = 'rgba(220, 20, 60, 0.8)';
        
        for (const level of contourLevels) {
            const threshold = maxDensity2 * level;
            drawContour(densities2, threshold, 'red');
        }
        
        return { densities1, densities2 };
    }
    
    // Function to draw a contour at a specific threshold level
    function drawContour(densities, threshold, color) {
        const resolution = densities.length;
        const xStep = (plotBounds.xMax - plotBounds.xMin) / resolution;
        const yStep = (plotBounds.yMax - plotBounds.yMin) / resolution;
        
        ctx.strokeStyle = color === 'blue' ? 'rgba(30, 144, 255, 0.8)' : 'rgba(220, 20, 60, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let started = false;
        
        for (let i = 0; i < resolution - 1; i++) {
            const x = plotBounds.xMin + i * xStep;
            
            for (let j = 0; j < resolution - 1; j++) {
                const y = plotBounds.yMin + j * yStep;
                
                const d00 = densities[i][j] - threshold;
                const d01 = densities[i][j + 1] - threshold;
                const d10 = densities[i + 1][j] - threshold;
                const d11 = densities[i + 1][j + 1] - threshold;
                
                // Check if contour passes through this cell
                if ((d00 * d01 <= 0) || (d00 * d10 <= 0) || (d01 * d11 <= 0) || (d10 * d11 <= 0)) {
                    const centerX = x + xStep / 2;
                    const centerY = y + yStep / 2;
                    const [canvasX, canvasY] = mapToCanvas(centerX, centerY);
                    
                    if (!started) {
                        ctx.moveTo(canvasX, canvasY);
                        started = true;
                    } else {
                        ctx.lineTo(canvasX, canvasY);
                    }
                }
            }
        }
        
        ctx.stroke();
    }
    
    // Function to visualize decision boundary
    function visualizeDecisionBoundary() {
        if (!validateInputs()) return;
        
        const params = getParams();
        
        // Clear the canvas and redraw axes
        clearCanvas();
        
        // Higher resolution for smooth decision boundary
        const resolution = 300; // Increased resolution for sharper boundaries 
        const xStep = (plotBounds.xMax - plotBounds.xMin) / resolution;
        const yStep = (plotBounds.yMax - plotBounds.yMin) / resolution;
        
        // Create two separate canvas layers
        // 1. Background layer for class regions
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = width;
        bgCanvas.height = height;
        const bgCtx = bgCanvas.getContext('2d');
        
        // 2. Boundary layer for decision boundary
        const boundaryCanvas = document.createElement('canvas');
        boundaryCanvas.width = width;
        boundaryCanvas.height = height;
        const boundaryCtx = boundaryCanvas.getContext('2d');
        
        // Create ImageData for both layers
        const bgImageData = bgCtx.createImageData(width, height);
        const boundaryImageData = boundaryCtx.createImageData(width, height);
        
        // For each pixel in the canvas
        for (let canvasY = 0; canvasY < height; canvasY++) {
            for (let canvasX = 0; canvasX < width; canvasX++) {
                // Convert canvas coordinates to data coordinates
                const [x, y] = mapFromCanvas(canvasX, canvasY);
                
                // Calculate posterior probabilities using Bayes' rule
                const likelihood1 = mvnPDF([x, y], params.mean1, params.cov1);
                const likelihood2 = mvnPDF([x, y], params.mean2, params.cov2);
                
                const posterior1 = likelihood1 * params.prior1;
                const posterior2 = likelihood2 * params.prior2;
                
                // Calculate index in image data array
                const index = (canvasY * width + canvasX) * 4;
                
                // Set background color based on which class is more likely
                if (posterior1 > posterior2) {
                    // Class 1 region - light blue
                    bgImageData.data[index] = 200;     // R
                    bgImageData.data[index + 1] = 230; // G
                    bgImageData.data[index + 2] = 255; // B
                    bgImageData.data[index + 3] = 100; // Alpha
                } else {
                    // Class 2 region - light red
                    bgImageData.data[index] = 255;     // R
                    bgImageData.data[index + 1] = 200; // G
                    bgImageData.data[index + 2] = 200; // B
                    bgImageData.data[index + 3] = 100; // Alpha
                }
                
                // Check if point is on decision boundary (approximately equal posteriors)
                // Using a more precise threshold for boundary detection
                if (Math.abs(posterior1 - posterior2) < 0.005 * Math.max(posterior1, posterior2)) {
                    boundaryImageData.data[index] = 0;       // R
                    boundaryImageData.data[index + 1] = 0;   // G
                    boundaryImageData.data[index + 2] = 0;   // B
                    boundaryImageData.data[index + 3] = 255; // Alpha - fully opaque
                }
            }
        }
        
        // Apply the background classes
        bgCtx.putImageData(bgImageData, 0, 0);
        ctx.drawImage(bgCanvas, 0, 0);
        
        // Draw the axes
        drawAxes();
        
        // Apply the boundary as a separate layer
        boundaryCtx.putImageData(boundaryImageData, 0, 0);
        
        // Apply a blur to make the boundary more visible
        boundaryCtx.globalCompositeOperation = 'source-over';
        boundaryCtx.filter = 'blur(0.5px)';
        boundaryCtx.drawImage(boundaryCanvas, 0, 0);
        
        // Reset the filter and draw the boundary with increased thickness
        boundaryCtx.filter = 'none';
        boundaryCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(boundaryCanvas, 0, 0);
        
        // Draw data points on top
        drawPoints();
        
        // Add legend with increased visibility
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        
        // Add a semi-transparent background for the legend
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(10, 10, 130, 80);
        
        // Class 1 legend
        ctx.fillStyle = 'rgba(30, 144, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(25, 25, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.fillText('Class 1', 40, 29);
        
        // Class 2 legend
        ctx.fillStyle = 'rgba(220, 20, 60, 0.8)';
        ctx.beginPath();
        ctx.arc(25, 50, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.fillText('Class 2', 40, 54);
        
        // Decision boundary legend
        ctx.fillStyle = 'black';
        ctx.fillRect(22, 70, 12, 3);
        ctx.fillText('Decision Boundary', 40, 74);
    }
    
    // Event listeners for buttons
    generateBtn.addEventListener('click', function() {
        if (!validateInputs()) return;
        
        const params = getParams();
        const numSamples = 100;
        
        // Generate random samples for each class
        points1 = generateMultivariateNormal(params.mean1, params.cov1, numSamples);
        points2 = generateMultivariateNormal(params.mean2, params.cov2, numSamples);
        
        // Determine plot bounds based on data
        let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
        
        for (const point of [...points1, ...points2]) {
            xMin = Math.min(xMin, point[0]);
            xMax = Math.max(xMax, point[0]);
            yMin = Math.min(yMin, point[1]);
            yMax = Math.max(yMax, point[1]);
        }
        
        // Add some padding to bounds
        const xPadding = (xMax - xMin) * 0.2;
        const yPadding = (yMax - yMin) * 0.2;
        
        plotBounds = {
            xMin: Math.max(-10, xMin - xPadding),
            xMax: Math.min(10, xMax + xPadding),
            yMin: Math.max(-10, yMin - yPadding),
            yMax: Math.min(10, yMax + yPadding)
        };
        
        clearCanvas();
        drawPoints();
    });
    
    markAllBtn.addEventListener('click', function() {
        visualizeDecisionBoundary();
    });
    
    clearBtn.addEventListener('click', function() {
        points1 = [];
        points2 = [];
        plotBounds = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
        clearCanvas();
    });
      // Initialize the canvas
    clearCanvas();

    // Add touch support for mobile devices
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent scrolling when touching the canvas
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        // Process the touch as you would a click
        // Add code here if needed to handle the touch event
    });

    // Load example configurations if available
    if (typeof boundaryExamples !== 'undefined') {
        // Create example buttons
        const configContainer = document.createElement('div');
        configContainer.className = 'example-buttons';
        configContainer.innerHTML = '<h3>Load Examples:</h3>';
        
        for (const key in boundaryExamples) {
            const button = document.createElement('button');
            button.textContent = boundaryExamples[key].name;
            button.onclick = function() { loadExample(key); };
            configContainer.appendChild(button);
        }
        
        // Add to the control panel
        const controlPanel = document.querySelector('.experiment-controls');
        controlPanel.appendChild(configContainer);
    }
});
