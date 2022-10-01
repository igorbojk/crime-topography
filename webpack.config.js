const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Crime Topography',
            filename: 'index.html',
            inject: 'body',
            template: 'src/index.html'
        })
    ],
    module: {
        rules: [{
            test: /\.scss$/,
            use: [
                'style-loader',
                'css-loader',
                'sass-loader'
            ]
        }]
    }
};