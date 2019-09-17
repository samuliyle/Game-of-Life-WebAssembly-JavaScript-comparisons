import './style.css';

const canvasWidth = 960;
const canvasHeight = 640;

const gridWidth = 20;
const gridHeight = 20;

const fontSize = `${Math.floor(gridHeight / 3)}px Arial`;

const gridCountX = canvasHeight / gridHeight;
const gridCountY = canvasWidth / gridWidth;

let board = [];

let generation = 0;

for (let i = 0; i < gridCountX; i++) {
    board[i] = [];
    for (let j = 0; j < gridCountY; j++) {
        board[i][j] = 0;
    }
}

board[3][5] = 1;
board[4][5] = 1;
board[5][5] = 1;
board[6][5] = 1;
board[7][5] = 1;

board[3][7] = 1;
board[7][7] = 1;

board[3][9] = 1;
board[4][9] = 1;
board[5][9] = 1;
board[6][9] = 1;
board[7][9] = 1;

// Main loop
export function draw(canvasContext) {
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
                    neighbourCount++;
                }
                // |0|1|0|
                // |0|x|0|
                // |0|0|0|
                if (board[y - 1][x] === 1) {
                    neighbourCount++;
                }
                // |0|0|1|
                // |0|x|0|
                // |0|0|0|
                if (x + 1 !== board[y].length && board[y - 1][x + 1] === 1) {
                    neighbourCount++;
                }
            }
            // |0|0|0|
            // |1|x|0|
            // |0|0|0|
            if (x !== 0 && board[y][x - 1] === 1) {
                neighbourCount++;
            }
            // |0|0|0|
            // |0|x|1|
            // |0|0|0|
            if (x + 1 !== board[y].length && board[y][x + 1] === 1) {
                neighbourCount++;
            }

            // Bottom row
            if (y + 1 !== board.length) {
                // |0|0|0|
                // |0|x|0|
                // |1|0|0|
                if (x !== 0 && board[y + 1][x - 1] === 1) {
                    neighbourCount++;
                }
                // |0|0|0|
                // |0|x|0|
                // |0|1|0|
                if (board[y + 1][x] === 1) {
                    neighbourCount++;
                }
                // |0|0|0|
                // |0|x|0|
                // |0|0|1|
                if (x + 1 !== board[y].length && board[y + 1][x + 1] === 1) {
                    neighbourCount++;
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
    drawLife(nextGeneration, canvasContext);
    board = nextGeneration;
    generation++;
}

export function drawLife(state, canvasContext) {
    for (let y = 0; y < state.length; y++) {
        for (let x = 0; x < state[y].length; x++) {
            canvasContext.clearRect((x * gridWidth) + 1, (y * gridHeight) + 1, gridWidth - 1, gridHeight - 1);
            if (state[y][x] === 1) {
                canvasContext.beginPath();
                canvasContext.rect((x * gridWidth) + 1, (y * gridHeight) + 1, gridWidth - 1, gridHeight - 1);
                canvasContext.fillStyle = "black";
                canvasContext.fill();
                canvasContext.closePath();
            }
            canvasContext.font = fontSize;
            canvasContext.fillStyle = "red";
            canvasContext.textAlign = "center";
            canvasContext.fillText(`${y},${x}`, (x * gridWidth) + (gridWidth / 2), (y * gridHeight) + (gridHeight / 2));
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("myCanvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const button = document.getElementById("nextButton");
    const canvasContext = canvas.getContext("2d");
    for (let i = 1; i < gridCountX; i++) {
        canvasContext.beginPath();
        canvasContext.rect(0, i * gridHeight, canvasWidth, 1);
        canvasContext.fillStyle = "grey";
        canvasContext.fill();
        canvasContext.closePath();
    }
    for (let i = 1; i < gridCountY; i++) {
        canvasContext.beginPath();
        canvasContext.rect(i * gridWidth, 0, 1, canvasHeight);
        canvasContext.fillStyle = "grey";
        canvasContext.fill();
        canvasContext.closePath();
    }
    drawLife(board, canvasContext);
    button.addEventListener("click", () => {
        draw(canvasContext);
    });
});

