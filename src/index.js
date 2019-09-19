import './style.css';

const stageContainer = document.getElementById('stage');
const backgroundCanvas = document.getElementById('backgroundCanvas');
const gameCanvas = document.getElementById('gameCanvas');
const debugCanvas = document.getElementById('debugCanvas');
const interactionCanvas = document.getElementById('interactionCanvas');

const backgroundCanvasContext = backgroundCanvas.getContext('2d');
const debugCanvasContext = debugCanvas.getContext('2d');
const gameCanvasContext = gameCanvas.getContext('2d');

const canvasWidth = 640;
const canvasHeight = 320;

const gridWidth = 40;
const gridHeight = 40;

const fontSize = `${Math.floor(gridHeight / 3)}px Arial`;

const gridCountX = canvasHeight / gridHeight;
const gridCountY = canvasWidth / gridWidth;

let generation = 0;

let board = [];
// Initialise board
for (let i = 0; i < gridCountX; i++) {
    board[i] = [];
    for (let j = 0; j < gridCountY; j++) {
        board[i][j] = 0;
    }
}

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

function drawDebugCoordinates() {
    for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
            fillDebugCoordinates(x, y);
        }
    }
}

export function drawLife(state) {
    for (let y = 0; y < state.length; y++) {
        for (let x = 0; x < state[y].length; x++) {
            // TODO: Is this necessary each time?
            clearGridRect(x, y);
            if (state[y][x] === 1) {
                drawGridRect(x, y);
            }
        }
    }
}

// Main loop
export function draw() {
    // Draw life
    console.log(board);
    const nextGeneration = [];
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
                console.log(`(${y}, ${x}) died. Neighbours: ${neighbourCount}`);
                nextGeneration[y][x] = 0;
            } else if (current === 0 && neighbourCount === 3) {
                nextGeneration[y][x] = 1;
            } else {
                nextGeneration[y][x] = current;
            }
        }
    }
    drawLife(nextGeneration);
    board = nextGeneration;
    generation += 1;
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

document.addEventListener('DOMContentLoaded', () => {
    stageContainer.style.width = `${canvasWidth}px`;
    stageContainer.style.height = `${canvasHeight}px`;
    backgroundCanvas.width = canvasWidth;
    backgroundCanvas.height = canvasHeight;
    backgroundCanvasContext.fillStyle = 'grey';

    debugCanvas.width = canvasWidth;
    debugCanvas.height = canvasHeight;
    debugCanvasContext.font = fontSize;
    debugCanvasContext.fillStyle = 'red';
    debugCanvasContext.textAlign = 'center';

    gameCanvas.width = canvasWidth;
    gameCanvas.height = canvasHeight;
    gameCanvasContext.fillStyle = 'black';

    interactionCanvas.width = canvasWidth;
    interactionCanvas.height = canvasHeight;

    interactionCanvas.addEventListener('click', (event) => {
        if (generation === 0) {
            // Calculate grid coordinates from clicked x, y coordinates
            const rect = interactionCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const gridX = Math.floor(x / gridWidth);
            const gridY = Math.floor(y / gridHeight);
            console.log({ gridX, gridY });
            addOrRemoveLife(gridX, gridY);
        }
    });

    drawGrid();
    drawDebugCoordinates();
    drawLife(board);

    const nextButton = document.getElementById('nextButton');
    nextButton.addEventListener('click', () => {
        draw();
    });
});
