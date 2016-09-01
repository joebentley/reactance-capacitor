/* globals $ lib MathJax */

/* Run app when all MathJax has loaded. */
MathJax.Hub.Queue(function () {
  // Unhide diagram
  $('#hidden').css('visibility', '')

  lib.drawReactanceVsCapacitance('box')
  // lib.drawReactanceVsFrequency('box')
})
