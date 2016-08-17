/* globals JXG */

var lib = {}

;(function (ns) {
  ns.runApp = function (graphElemID) {
    var board = JXG.JSXGraph.initBoard(graphElemID, {
      boundingBox: [-1, 5, 5, -1],
      axis: true,
      showCopyright: false
    })

    var frequency = board.create('slider', [[1, 1], [3, 1], [0.01, 1, 5]],
      { name: 'frequency in Hz' })

    board.create('functiongraph', [
      function (C) {
        return 1 / (2 * Math.PI * frequency.Value() * C)
      }
    ])
  }
})(lib)
