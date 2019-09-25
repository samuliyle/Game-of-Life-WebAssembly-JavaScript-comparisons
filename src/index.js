import './style.css';

import premadeBoards from './premadeboards';

const backgroundCanvas = document.getElementById('backgroundCanvas');
const gameCanvas = document.getElementById('gameCanvas');
const debugCanvas = document.getElementById('debugCanvas');
const interactionCanvas = document.getElementById('interactionCanvas');

const iterationSlider = document.getElementById('iterationIntervalSlider');
const gridSizeSlider = document.getElementById('gridSizeSlider');

const fpsElement = document.getElementById('fps');
const speedElement = document.getElementById('speed');
const gridElement = document.getElementById('grid');
const generationElement = document.getElementById('generation');

const backgroundCanvasContext = backgroundCanvas.getContext('2d');
const debugCanvasContext = debugCanvas.getContext('2d');
const gameCanvasContext = gameCanvas.getContext('2d');

const canvasWidth = gameCanvas.width;
const canvasHeight = gameCanvas.height;

let enableDebugCoordinates = true;

let gridWidth = gridSizeSlider.value;
let gridHeight = gridSizeSlider.value;
gridElement.textContent = gridSizeSlider.value;
let step = iterationSlider.value;
speedElement.textContent = step;

let gridCountX = canvasHeight / gridHeight;
let gridCountY = canvasWidth / gridWidth;

let last = null;
let lastFrame = null;

let animationRequestId;
let generation = 0;

function createEmptyBoard() {
    const emptyBoard = [];
    for (let i = 0; i < gridCountX; i++) {
        emptyBoard[i] = [];
        for (let j = 0; j < gridCountY; j++) {
            emptyBoard[i][j] = 0;
        }
    }
    return emptyBoard;
}

// Initialise board
let board = [];
board = createEmptyBoard();

function clearGridRect(x, y) {
    gameCanvasContext.clearRect((x * gridWidth) + 1, (y * gridHeight) + 1, gridWidth - 1, gridHeight - 1);
}

function drawGridRect(x, y) {
    gameCanvasContext.beginPath();
    gameCanvasContext.rect((x * gridWidth) + 1, (y * gridHeight) + 1, gridWidth - 1, gridHeight - 1);
    gameCanvasContext.fill();
    gameCanvasContext.closePath();
}

function fillDebugCoordinates(x, y) {
    debugCanvasContext.fillText(`${y},${x}`, (x * gridWidth) + (gridWidth / 2), (y * gridHeight) + (gridHeight / 2));
}

function roundToPrecision(x) {
    // eslint-disable-next-line prefer-template
    return +(Math.round(x + 'e+2') + 'e-2');
}

function updateFps(fps) {
    fpsElement.textContent = roundToPrecision(fps);
}

function updateGeneration(currentGeneration) {
    generationElement.textContent = currentGeneration;
}

function clearDebugCoordinates() {
    debugCanvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
}

function drawDebugCoordinates() {
    debugCanvasContext.font = `${Math.floor(gridHeight / 3)}px Arial`;
    for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
            fillDebugCoordinates(x, y);
        }
    }
}

function clearLife() {
    gameCanvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
}

export function drawLife(state = board) {
    clearLife();
    for (let y = 0; y < state.length; y++) {
        for (let x = 0; x < state[y].length; x++) {
            if (state[y][x] === 1) {
                drawGridRect(x, y);
            }
        }
    }
}

function start() {
    if (!animationRequestId) {
        // eslint-disable-next-line no-use-before-define
        animationRequestId = window.requestAnimationFrame(draw);
    }
}

function stop() {
    if (animationRequestId) {
        window.cancelAnimationFrame(animationRequestId);
        animationRequestId = undefined;
    }
}

function clearBoard() {
    stop();
    generation = 0;
    updateGeneration(generation);
    clearLife();
    board.forEach((element) => {
        element.fill(0);
    });
}

// Main loop
export function draw(time) {
    // Draw life
    animationRequestId = undefined;
    let nextGeneration = null;
    if (last === null) {
        last = time;
        lastFrame = time;
    }
    const progress = time - last;
    if (progress > step) {
        nextGeneration = [];
        for (let y = 0; y < board.length; y++) {
            nextGeneration[y] = [];
            for (let x = 0; x < board[y].length; x++) {
                let neighbourCount = 0;
                // Upper row
                if (y !== 0) {
                    // |1|0|0|
                    // |0|x|0|
                    // |0|0|0|
                    if (x !== 0 && board[y - 1][x - 1] === 1) {
                        neighbourCount += 1;
                    }
                    // |0|1|0|
                    // |0|x|0|
                    // |0|0|0|
                    if (board[y - 1][x] === 1) {
                        neighbourCount += 1;
                    }
                    // |0|0|1|
                    // |0|x|0|
                    // |0|0|0|
                    if (x + 1 !== board[y].length && board[y - 1][x + 1] === 1) {
                        neighbourCount += 1;
                    }
                }
                // |0|0|0|
                // |1|x|0|
                // |0|0|0|
                if (x !== 0 && board[y][x - 1] === 1) {
                    neighbourCount += 1;
                }
                // |0|0|0|
                // |0|x|1|
                // |0|0|0|
                if (x + 1 !== board[y].length && board[y][x + 1] === 1) {
                    neighbourCount += 1;
                }

                // Bottom row
                if (y + 1 !== board.length) {
                    // |0|0|0|
                    // |0|x|0|
                    // |1|0|0|
                    if (x !== 0 && board[y + 1][x - 1] === 1) {
                        neighbourCount += 1;
                    }
                    // |0|0|0|
                    // |0|x|0|
                    // |0|1|0|
                    if (board[y + 1][x] === 1) {
                        neighbourCount += 1;
                    }
                    // |0|0|0|
                    // |0|x|0|
                    // |0|0|1|
                    if (x + 1 !== board[y].length && board[y + 1][x + 1] === 1) {
                        neighbourCount += 1;
                    }
                }
                const current = board[y][x];
                if (current === 1 && (neighbourCount <= 1 || neighbourCount > 3)) {
                    // console.log(`(${y}, ${x}) died. Neighbours: ${neighbourCount}`);
                    nextGeneration[y][x] = 0;
                } else if (current === 0 && neighbourCount === 3) {
                    nextGeneration[y][x] = 1;
                } else {
                    nextGeneration[y][x] = current;
                }
            }
        }
        updateFps(1000 / (time - lastFrame));
        last = time;
        board = nextGeneration;
        generation += 1;
        updateGeneration(generation);
    }
    lastFrame = time;
    drawLife(nextGeneration || board);
    start();
}

function addOrRemoveLife(x, y) {
    if (board[y][x] === 0) {
        board[y][x] = 1;
        drawGridRect(x, y);
    } else {
        board[y][x] = 0;
        clearGridRect(x, y);
    }
}

function clearGrid() {
    backgroundCanvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
}

function drawGrid() {
    for (let i = 1; i < gridCountX; i++) {
        backgroundCanvasContext.beginPath();
        backgroundCanvasContext.rect(0, i * gridHeight, canvasWidth, 1);
        backgroundCanvasContext.fill();
        backgroundCanvasContext.closePath();
    }
    for (let i = 1; i < gridCountY; i++) {
        backgroundCanvasContext.beginPath();
        backgroundCanvasContext.rect(i * gridWidth, 0, 1, canvasHeight);
        backgroundCanvasContext.fill();
        backgroundCanvasContext.closePath();
    }
}

function clearAll() {
    clearGrid();
    clearLife();
    if (enableDebugCoordinates) {
        clearDebugCoordinates();
    }
}

function drawAll() {
    drawGrid();
    drawLife();
    if (enableDebugCoordinates) {
        drawDebugCoordinates();
    }
}

function gridSizeChange(value, keepBoard = true) {
    gridWidth = value;
    gridHeight = value;
    gridCountX = canvasHeight / gridHeight;
    gridCountY = canvasWidth / gridWidth;
    clearAll();
    if (keepBoard) {
        const newBoard = [];
        // Expand current board
        for (let i = 0; i < gridCountX; i++) {
            newBoard[i] = [];
            for (let j = 0; j < gridCountY; j++) {
                // TODO: Improve
                if (board[i] !== undefined && board[i][j] !== undefined) {
                    newBoard[i][j] = board[i][j];
                } else {
                    newBoard[i][j] = 0;
                }
            }
        }
        board = newBoard;
    }
    drawAll();
}

document.addEventListener('DOMContentLoaded', () => {
    backgroundCanvasContext.fillStyle = 'grey';

    debugCanvasContext.fillStyle = 'red';
    debugCanvasContext.textAlign = 'center';

    gameCanvasContext.fillStyle = 'black';

    interactionCanvas.addEventListener('click', (event) => {
        if (generation === 0) {
            // Calculate grid coordinates from clicked x, y coordinates
            const rect = interactionCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const gridX = Math.floor(x / gridWidth);
            const gridY = Math.floor(y / gridHeight);
            if (event.shiftKey) {
                const selectedRow = board[gridY];
                for (let i = 0; i < selectedRow.length; i++) {
                    addOrRemoveLife(i, gridY);
                }
            } else {
                addOrRemoveLife(gridX, gridY);
            }
        }
    });

    const debugCoordinatesCheckbox = document.getElementById('debugCoordinates');
    enableDebugCoordinates = debugCoordinatesCheckbox.checked;
    debugCoordinatesCheckbox.addEventListener('change', (event) => {
        enableDebugCoordinates = event.target.checked;
        if (enableDebugCoordinates) {
            drawDebugCoordinates();
        } else {
            clearDebugCoordinates();
        }
    });

    iterationSlider.addEventListener('input', (event) => {
        step = event.target.value;
        speedElement.textContent = step;
    });

    gridSizeSlider.addEventListener('input', (event) => {
        gridSizeChange(event.target.value);
        gridElement.textContent = event.target.value;
    });
    const premadeBoardSelect = document.getElementById('premadeBoardSelect');
    premadeBoardSelect.addEventListener('change', (event) => {
        if (event.target.value.length !== 0) {
            const premadeBoard = premadeBoards[event.target.value];
            if (premadeBoard) {
                gridSizeSlider.value = premadeBoard.gridSize;
                iterationSlider.value = premadeBoard.speed;
                step = premadeBoard.speed;
                board = premadeBoard.board;
                gridSizeChange(premadeBoard.gridSize, false);
            }
        }
    });

    const nextButton = document.getElementById('nextButton');
    nextButton.addEventListener('click', () => {
        draw();
    });

    const startStopButton = document.getElementById('startStopButton');
    startStopButton.addEventListener('click', () => {
        if (animationRequestId) {
            stop();
            startStopButton.textContent = 'Start';
        } else {
            start();
            startStopButton.textContent = 'Stop';
        }
    });

    const clearButton = document.getElementById('clearButton');
    clearButton.addEventListener('click', () => {
        clearBoard();
    });

    drawAll();
});
