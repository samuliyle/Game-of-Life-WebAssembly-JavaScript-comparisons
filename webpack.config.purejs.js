const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        app: './src/PureJS/index.js',
    },
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './dist',
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: 'Output management',
            filename: 'index.html',
            template: 'index.html',
        }),
    ],
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    node: {
        fs: 'empty',
    },
    module: {
        rules: [
            {
                test: /\.(js)$/,
                exclude: /node_modules/,
                use: ['eslint-loader'],
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                ],
            },
            // {
            //     test: /\.(png|svg|jpg|gif)$/,
            //     use: [
            //         'file-loader',
            //     ],
            // },
            {
                test: /add\.wasm$/,
                type: 'javascript/auto',
                loader: 'file-loader',
            },
        ],
    },
};
