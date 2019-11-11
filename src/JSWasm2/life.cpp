#include <emscripten.h>
#include <vector>

const int gridWidth = 2;
const int gridHeight = 2;

extern "C"
{
    // EMSCRIPTEN_KEEPALIVE
    void setRect(int x, int y, std::vector<float> &arr)
    {
        const float _x1 = (x * gridWidth) + 1.0f;
        const float _x2 = (x * gridWidth) + gridWidth;
        const float _y1 = (y * gridHeight) + 1.0f;
        const float _y2 = (y * gridHeight) + gridHeight;
        arr.insert(arr.end(), {_x1, _y1,
                               _x2, _y1,
                               _x1, _y2,
                               _x1, _y2,
                               _x2, _y1,
                               _x2, _y2});
    }

    // EMSCRIPTEN_KEEPALIVE
    float* drawLife(int *board, int gridCountY, int gridCountX)
    {
        std::vector<float> vertexes;
        for (int y = 0; y < gridCountY; y++)
        {
            for (int x = 0; x < gridCountX; x++)
            {
                int i = x + gridCountX * y;
                if (board[i] == 1)
                {
                    setRect(x, y, vertexes);
                }
            }
        }
        return vertexes.data();
    }

    // EMSCRIPTEN_KEEPALIVE
    int getValue(int *array, int x, int y, int gridCountY, int gridCountX)
    {
        return array[((x % gridCountX + gridCountX) % gridCountX) + gridCountX * ((y % gridCountY + gridCountY) % gridCountY)];
    }

    // EMSCRIPTEN_KEEPALIVE
    int calculate1dNeighbors(int *board, int i, int gridCountY, int gridCountX)
    {
        int xIndex = i % gridCountX;
        int neighbourCount = 0;
        int yIndex = i / gridCountX;
        neighbourCount += getValue(board, xIndex - 1, yIndex - 1, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex, yIndex - 1, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex + 1, yIndex - 1, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex - 1, yIndex, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex + 1, yIndex, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex - 1, yIndex + 1, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex, yIndex + 1, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex + 1, yIndex + 1, gridCountY, gridCountX);
        return neighbourCount;
    }

    // EMSCRIPTEN_KEEPALIVE
    void calculateNextGeneration(int *board, int *nextGeneration, int gridCountY, int gridCountX)
    {
        for (int y = 0; y < gridCountY; y++)
        {
            for (int x = 0; x < gridCountX; x++)
            {
                int i = x + gridCountX * y;
                nextGeneration[i] = 1;
                int neighbourCount = calculate1dNeighbors(board, i, gridCountY, gridCountX);
                int current = board[i];
                // Rules 1 and 3
                if (current == 1 && (neighbourCount <= 1 || neighbourCount > 3))
                {
                    nextGeneration[i] = 0;
                }
                // Rule 4
                else if (current == 0 && neighbourCount == 3)
                {
                    nextGeneration[i] = 1;
                }
                // Rule 2
                else
                {
                    nextGeneration[i] = current;
                }
            }
        }
    }
}
