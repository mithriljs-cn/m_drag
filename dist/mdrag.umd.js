(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.mdrag = factory());
}(this, (function () { 'use strict';

var defaultOptions = {
  revertOnFail: true,
  larg: false,
  touch: ('ontouchstart' in window) || ('DocumentTouch' in window && document instanceof DocumentTouch)
};

function mdrag (options) {
  options = options || {};
  for (var i in defaultOptions) {
    if (!(i in options)) { options[i] = defaultOptions[i]; }
  }
  var isTouch = options.touch;
  var larg = options.larg;
  // var larg = 'larg' in options ? options.larg : false
  var startE = options.startE || (isTouch ? 'touchstart' : 'mousedown');
  var moveE = options.moveE || (isTouch ? 'touchmove' : 'mousemove');
  var endE = options.endE || (isTouch ? 'touchend' : 'mouseup');
  var dragRoot = {};
  var counter = 0;

  function getDownFunc (name) {
    return function downHandle (evt) {
      var data = dragRoot[name];
      if (!data) { return }
      var e = data.e = data.config.getEvent(evt);
      data.target = this;
      data.ox = e.ox || e.pageX;
      data.oy = e.oy || e.pageY;
      var onstart = data.config.onstart;
      if (onstart && onstart.call(
          this, evt, data
        ) === false) { return }
      data.type = evt.type;
    }
  }

  function moveHandle (evt) {
    for (var name in dragRoot) {
      var data = dragRoot[name];
      if (!data.type) { continue }
      var config = data.config;
      var e = data.e = config.getEvent(evt, data);
      var stack = [data.pageX, data.pageY, data.dx, data.dy];
      data.pageX = e.pageX;
      data.pageY = e.pageY;
      data.dx = data.ox - e.pageX;
      data.dy = data.oy - e.pageY;
      var onmove = config.onmove;
      if (onmove && onmove(evt, data) === false) {
        if (options.revertOnFail) {
          data.dy = stack.pop();
          data.dx = stack.pop();
          data.pageY = stack.pop();
          data.pageX = stack.pop();
        }
        return endHandle(evt)
      }
    }
  }

  function endHandle (evt) {
    for (var name in dragRoot) {
      var data = dragRoot[name];
      if (!data.type) { continue }
      data.e = data.config.getEvent(evt);
      var onend = data.config.onend;
      onend && onend(evt, data);
      data.type = null;
      data.dx = data.dy = 0;
    }
  }
  document.addEventListener(moveE, moveHandle, larg);
  document.addEventListener(endE, endHandle, larg);

  function dragHandler (config) {
    if (arguments.length === 0) { return dragRoot }
    config = config || {};
    config.getEvent = config.getEvent || function(evt) {
      return /touch/.test(evt.type)
        ? evt.changedTouches && evt.changedTouches[0] || evt.touches[0]
        : evt
    };
    var name = config.name || '$' + counter++;
    if (dragRoot[name]) {
      dragRoot[name].destroy(true);
    }
    var startCB = getDownFunc(name);
    var context = {
      name: name,
      config: config,
      start: startCB,
      root: dragRoot,
      options: options
    };

    // auto bind down event if have data.el
    var el = config.el;
    if (el) {
      el.addEventListener(startE, startCB, larg);
      el.mdrag = context;
    }
    context.destroy = function (force) {
      var ondestroy = config.ondestroy;
      if(!force && ondestroy && ondestroy(force, context)===false) { return }
      if (el) {
        el.removeEventListener(startE, startCB, larg);
      }
      delete dragRoot[name];
      context.destroyed = true;
      // console.log(name, el, dragRoot[name])
    };
    startCB.mdrag = dragRoot[name] = context;
    return startCB
  }
  dragHandler.destroyAll = function () {
    for (var name in dragRoot) {
      dragRoot[name].destroy(true);
    }
    document.removeEventListener(moveE, moveHandle, larg);
    document.removeEventListener(endE, endHandle, larg);
  };
  return dragHandler
}

return mdrag;

})));