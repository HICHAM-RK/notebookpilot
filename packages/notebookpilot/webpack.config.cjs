module.exports = {
  module: {
    rules: [
      {
        test: /python\.worker\.js$/,
        type: "asset/resource",
        generator: { filename: "static/[name][ext]" },
      },
      {
        test: /[\\/]pypi[\\/].*\.(whl|json)$/,
        type: "asset/resource",
        generator: { filename: "static/[name][ext]" },
      },
    ],
  },
};
