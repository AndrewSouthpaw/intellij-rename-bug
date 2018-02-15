// Example webpack configuration with asset fingerprinting in production.
var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var StatsPlugin = require('stats-webpack-plugin');
// var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// must match config.webpack.dev_server.port
var devServerPort = 3808;

// set NODE_ENV=production on the environment to add asset fingerprints
var production = process.env.NODE_ENV === 'production';

var config = {
  entry: {
    'application.en': './frontend/src/locales/application.en.js',
    'application.en-GB': './frontend/src/locales/application.en-GB.js',
    'application.es': './frontend/src/locales/application.es.js',
    'application.de': './frontend/src/locales/application.de.js',
  },

  output: {
    // Build assets directly in to public/webpack/, let webpack know
    // that all webpacked assets start with webpack/

    // must match config.webpack.output_dir
    path: path.join(__dirname, 'public', 'webpack'),
    publicPath: '/webpack/',

    filename: production ? '[name]-[chunkhash].js' : '[name].js',

    libraryTarget: 'var',
    library: 'tc'
  },

  resolve: {
    alias: {
      'jquery.ui.widget': 'jquery-ui/ui/widget.js',
      'jquery-ui/widget': 'jquery-ui/ui/widget.js',
      'jquery-ui-css': 'jquery-ui/../../themes/base',
      'modules': path.resolve(__dirname, 'frontend/src/modules/'),
      'shared': path.resolve(__dirname, 'frontend/src/shared/'),
      'test_helpers': path.resolve(__dirname, 'frontend/src/test_helpers/'),
    },

    // Allow loading files relative to the root
    modules: [
      // by default, webpack will search in `web_modules` and `node_modules`. Because we're using
      // Bower, we want it to look in there too
      'node_modules',
      'bower_components'
    ],

    // tell webpack which extensions to auto search when it resolves modules. With this,
    // you'll be able to do `require('./utils')` instead of `require('./utils.jsx')`
    extensions: ['.js', '.jsx'],
  },

  plugins: [
    // new BundleAnalyzerPlugin(),

    // must match config.webpack.manifest_filename
    new StatsPlugin('manifest.json', {
      // We only need assetsByChunkName
      chunkModules: false,
      source: false,
      chunks: false,
      modules: false,
      assets: true
    }),

    new webpack.ProvidePlugin({
      I18n: 'i18n-js',
      jQuery: 'jquery',
      $: 'jquery'
    }),

    /**
     * Captures common application code, like our React components and Redux logic.
     * NB: the order matters here! The common plugin must come before the vendor plugin.
     */
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
    }),

    /**
     * Contains all our vendor files: React, Redux, jQuery, etc.
     */
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: function (module) {
        // this assumes your vendor imports exist in the node_modules directory
        return module.context && (
          module.context.indexOf('node_modules') !== -1 || module.context.indexOf('vendor') !== -1
        )
      },
    }),

    //  let's not include every locale with moment
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en-gb|es/),

    /**
     * Extracts the compiled CSS and creates a separate CSS file, so it can be cached by browsers (instead of it being
     * in-lined with a <style> tag). For reasons that defy comprehension, you CANNOT use a dynamically generated name,
     * such as '[name]-[hash].css', because it mysteriously only extracts some of the SCSS files (e.g. it will export
     * date_picker.scss, but not button.scss, or any new files). So, use a static name.
     */
    new ExtractTextPlugin({
      filename: 'public/style-[contenthash].css',
      allChunks: true
    })
  ],

  module: {
    // suppress stupid error message that colors.js outputs
    // Disable handling of requires with a single expression
    // http://webpack.github.io/docs/configuration.html#automatically-created-contexts-defaults-module-xxxcontextxxx
    exprContextRegExp: /$^/,
    exprContextCritical: false,

    rules: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules)/,
        use: [
          { loader: 'babel-loader', options: { presets: ['es2015', 'react', 'stage-2'] } }
        ],
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader', options: { modules: true } }
        ]
      },
      /**
       * Compile SCSS and extract to separate CSS file. Setup: http://bit.ly/2iRiKDr for base setup, and
       * http://bit.ly/2iRexPS for setting up autoprefixer with it.
       *
       * We include a source map for SASS because it's required by `resolve-url-loader`.
       */
      {
        test: /\.scss$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            { loader: 'css-loader', options: { '-autoprefixer': true } },
            { loader: 'resolve-url-loader' },
            { loader: 'postcss-loader', options: { sourceMap: true } },
            { loader: 'sass-loader', options: { sourceMap: true } }
          ]
        })
        // loader: ExtractTextPlugin.extract('style', 'css?-autoprefixer!resolve-url-loader!postcss!sass?sourceMap'),
      },
      /**
       * Load images referenced by SCSS files and stick them into `/images`. These could be referenced through an
       * import statement, e.g. `import myPicture from '../images/myPicture.jpg'` or through a `url()` statement in
       * a CSS/SCSS file.
       *
       * When adding files through url(), it is essential that you do not prepend with a `/`, otherwise SASS / file
       * loaders will ignore it. So, this will lead to pain:
       *
       *   background: url(/../../relative/path/to/foo.jpg)
       *
       * instead, you want
       *
       *   background: url(../../relative/path/to/foo.jpg)
       *
       * Also, it's possible to use relative paths because we use `resolve-url-loader`, which allows us to specify
       * relative paths to files in our SASS files. If that ever gets removed, these links would cease to function.
       */
      {
        test: /\.(jpe?g|gif|png)$/,
        use: [
          { loader: 'file-loader', options: { name: 'images/[name].[ext]' } }
        ]
      },
    ],
  },
};

if (production) {
  config.plugins.push(
    new webpack.NoErrorsPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compressor: { warnings: false },
      compress: {
        dead_code: true
      },
      sourceMap: true
    }),
    new webpack.DefinePlugin({
      'process.env': { NODE_ENV: JSON.stringify('production') }
    })
  );
  config.devtool = 'source-map';
} else {
  config.devServer = {
    port: devServerPort,
    headers: { 'Access-Control-Allow-Origin': '*' }
  };
  config.output.publicPath = '//localhost:' + devServerPort + '/webpack/';
  // Source maps
  config.devtool = 'eval-source-map';
}

module.exports = config;
