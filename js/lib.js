/* globals JXG */

var lib = {}

;(function (ns) {
  ns.runApp = function (graphElemID) {
    var board = JXG.JSXGraph.initBoard(graphElemID, {
      boundingbox: [-0.5, 10, 10, -0.5],
      keepaspectratio: false,
      showCopyright: false
    })

    var frequency = board.create('slider', [[3, 1], [6, 1], [0.01, 1, 5]],
      { name: 'frequency in Hz' })

    board.create('functiongraph', [
      function (C) {
        if (C > 0) {
          return 1 / (2 * Math.PI * frequency.Value() * C)
        }
      }
    ])

    board.create('axis', [[0, 0], [1, 0]], {
      name: 'C',
      withLabel: true,
      label: {
        position: 'rt',  // possible values are 'lft', 'rt', 'top', 'bot'
        offset: [-15, 20]   // (in pixels)
      }
    })

    board.create('axis', [[0, 0], [0, 1]], {
      name: 'X_C',
      withLabel: true,
      label: {
        position: 'rt',  // possible values are 'lft', 'rt', 'top', 'bot'
        offset: [30, 0]   // (in pixels)
      }
    })
  }
})(lib)
