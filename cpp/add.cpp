#include <emscripten.h>

const int gridCountX = 10;
const int gridCountY = 10;

int getElementAt(int x, int y, int board[gridCountX][gridCountY])
{
}

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int *copy_array(int *in_array, int length)
    {
        int out_array[length];
        for (int i = 0; i < length; i++)
        {
            out_array[i] = in_array[i];
        }
        return out_array;
    }

    EMSCRIPTEN_KEEPALIVE
    int add(int a, int b)
    {
        return a + b;
    }
}
