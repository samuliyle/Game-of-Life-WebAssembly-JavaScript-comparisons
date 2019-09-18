import './style.css';

const canvas = document.getElementById('myCanvas');
const canvasContext = canvas.getContext('2d');

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
    canvasContext.clearRect((x * gridWidth) + 1, (y * gridHeight) + 1, gridWidth - 1, gridHeight - 1);
}

function drawGridRect(x, y) {
    canvasContext.beginPath();
    canvasContext.rect((x * gridWidth) + 1, (y * gridHeight) + 1, gridWidth - 1, gridHeight - 1);
    canvasContext.fillStyle = 'black';
    canvasContext.fill();
    canvasContext.closePath();
}

export function drawLife(state) {
    for (let y = 0; y < state.length; y++) {
        for (let x = 0; x < state[y].length; x++) {
            // TODO: Is this necessary each time?
            clearGridRect(x, y);
            if (state[y][x] === 1) {
                drawGridRect(x, y);
            }
            canvasContext.font = fontSize;
            canvasContext.fillStyle = 'red';
            canvasContext.textAlign = 'center';
            canvasContext.fillText(`${y},${x}`, (x * gridWidth) + (gridWidth / 2), (y * gridHeight) + (gridHeight / 2));
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
    canvasContext.fillStyle = 'grey';
    for (let i = 1; i < gridCountX; i++) {
        canvasContext.beginPath();
        canvasContext.rect(0, i * gridHeight, canvasWidth, 1);
        canvasContext.fill();
        canvasContext.closePath();
    }
    for (let i = 1; i < gridCountY; i++) {
        canvasContext.beginPath();
        canvasContext.rect(i * gridWidth, 0, 1, canvasHeight);
        canvasContext.fill();
        canvasContext.closePath();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.addEventListener('click', (event) => {
        if (generation === 0) {
            // Calculate grid coordinates from clicked x, y coordinates
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const gridX = Math.floor(x / gridWidth);
            const gridY = Math.floor(y / gridHeight);
            console.log({ gridX, gridY });
            addOrRemoveLife(gridX, gridY);
        }
    });
    drawGrid();
    drawLife(board);

    const nextButton = document.getElementById('nextButton');
    nextButton.addEventListener('click', () => {
        draw();
    });
});
