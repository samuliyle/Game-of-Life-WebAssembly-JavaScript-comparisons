#include <emscripten.h>

// const int gridCountX = 10;
// const int gridCountY = 10;

// int getElementAt(int x, int y, int board[gridCountX][gridCountY])
// {
// }

extern "C"
{
    // void calculateNeighbors()
    // {
    // }
    EMSCRIPTEN_KEEPALIVE
    int add(int a, int b)
    {
        return a + b;
    }
}
