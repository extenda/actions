"use strict";

function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var fs = require('fs');
var core = require('@actions/core');
var SubTopology = /*#__PURE__*/function () {
  function SubTopology() {
    _classCallCheck(this, SubTopology);
  }
  _createClass(SubTopology, null, [{
    key: "startFormatter",
    value: function startFormatter(subTopology) {
      return "subgraph Sub-Topology: ".concat(subTopology);
    }
  }, {
    key: "endFormatter",
    value: function endFormatter() {
      return "end";
    }
  }, {
    key: "visit",
    value: function visit(line, subTopologies, subTopologiesList) {
      var match = line.match(this.pattern);
      // Close the previous sub-topology before opening a new one;
      if (subTopologies.length) {
        subTopologies.push(this.endFormatter());
      }
      if (match) {
        subTopologies.push(this.startFormatter(match[1]));
        subTopologiesList.push(match[1]);
      }
    }
  }]);
  return SubTopology;
}();
_defineProperty(SubTopology, "pattern", /Sub-topology: ([0-9]*)/);
var Source = /*#__PURE__*/function () {
  function Source() {
    _classCallCheck(this, Source);
  }
  _createClass(Source, null, [{
    key: "formatter",
    value: function formatter(source, topic) {
      return "".concat(topic, "[").concat(topic, "] --> ").concat(source);
    }
  }, {
    key: "visit",
    value: function visit(line, outside, topicSourcesList, ref) {
      var _this = this;
      var match = line.match(this.pattern);
      if (match) {
        ref.currentGraphNodeName = match[1].trim();
        var topics = match[2];
        topics.split(',').filter(String).map(function (topic) {
          return topic.trim();
        }).forEach(function (topic) {
          outside.push(_this.formatter(ref.currentGraphNodeName, topic));
          topicSourcesList.push(topic);
        });
      }
    }
  }]);
  return Source;
}();
_defineProperty(Source, "pattern", /Source:\s+(\S+)\s+\(topics:\s+\[(.*)\]\)/);
var Processor = /*#__PURE__*/function () {
  function Processor() {
    _classCallCheck(this, Processor);
  }
  _createClass(Processor, null, [{
    key: "formatter",
    value: function formatter(processor, store) {
      return processor.includes('JOIN') ? "".concat(store, "[(").concat(nameFunction(store), ")] --> ").concat(processor, "(").concat(nameFunction(processor), ")") : "".concat(processor, "(").concat(nameFunction(processor), ") --> ").concat(store, "[(").concat(nameFunction(store), ")]");
    }
  }, {
    key: "visit",
    value: function visit(line, ref, outside, stateStoresList) {
      var _this2 = this;
      var match = line.match(this.pattern);
      if (match) {
        ref.currentGraphNodeName = match[1].trim();
        var stores = match[2];
        stores.split(',').filter(String).map(function (store) {
          return store.trim();
        }).forEach(function (store) {
          outside.push(_this2.formatter(ref.currentGraphNodeName, store));
          stateStoresList.push(store);
        });
      }
    }
  }]);
  return Processor;
}();
_defineProperty(Processor, "pattern", /Processor:\s+(\S+)\s+\(stores:\s+\[(.*)\]\)/);
var Sink = /*#__PURE__*/function () {
  function Sink() {
    _classCallCheck(this, Sink);
  }
  _createClass(Sink, null, [{
    key: "formatter",
    value: function formatter(sink, topic) {
      return "".concat(sink, "(").concat(nameFunction(sink), ") --> ").concat(topic, "[").concat(topic, "]");
    }
  }, {
    key: "visit",
    value: function visit(line, ref, outside, topicSinksList) {
      var match = line.match(this.pattern);
      if (match) {
        ref.currentGraphNodeName = match[1].trim();
        var topic = match[2].trim();
        outside.push(this.formatter(ref.currentGraphNodeName, topic));
        topicSinksList.push(topic);
      }
    }
  }]);
  return Sink;
}();
_defineProperty(Sink, "pattern", /Sink:\s+(\S+)\s+\(topic:\s+(.*)\)/);
var RightArrow = /*#__PURE__*/function () {
  function RightArrow() {
    _classCallCheck(this, RightArrow);
  }
  _createClass(RightArrow, null, [{
    key: "formatter",
    value: function formatter(src, dst) {
      return "".concat(src, "(").concat(nameFunction(src), ") --> ").concat(dst, "(").concat(nameFunction(dst), ")");
    }
  }, {
    key: "visit",
    value: function visit(line, ref, subTopologies) {
      var _this3 = this;
      var match = line.match(this.pattern);
      if (match) {
        match[1].split(',').filter(String).map(function (target) {
          return target.trim();
        }).filter(function (target) {
          return target !== 'none';
        }).forEach(function (target) {
          subTopologies.push(_this3.formatter(ref.currentGraphNodeName, target));
        });
      }
    }
  }]);
  return RightArrow;
}();
_defineProperty(RightArrow, "pattern", /\s*-->\s+(.*)/);
var AsciiToMermaid = /*#__PURE__*/function () {
  function AsciiToMermaid() {
    _classCallCheck(this, AsciiToMermaid);
  }
  _createClass(AsciiToMermaid, null, [{
    key: "toMermaid",
    value: function toMermaid(topology) {
      var lines = topology.split('\n');
      var subTopologies = [];
      var outside = [];
      var currentGraphNodeName = {
        currentGraphNodeName: ''
      };
      var subTopologiesList = [];
      var topicSourcesList = [];
      var topicSinksList = [];
      var stateStoresList = [];
      var _iterator = _createForOfIteratorHelper(lines),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var line = _step.value;
          switch (true) {
            case SubTopology.pattern.test(line):
              SubTopology.visit(line, subTopologies, subTopologiesList);
              break;
            case Source.pattern.test(line):
              Source.visit(line, outside, topicSourcesList, currentGraphNodeName);
              break;
            case Processor.pattern.test(line):
              Processor.visit(line, currentGraphNodeName, outside, stateStoresList);
              break;
            case Sink.pattern.test(line):
              Sink.visit(line, currentGraphNodeName, outside, topicSinksList);
              break;
            case RightArrow.pattern.test(line):
              RightArrow.visit(line, currentGraphNodeName, subTopologies);
              break;
            default:
              break;
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      if (subTopologies.length) {
        subTopologies.push(SubTopology.endFormatter());
      }
      return ['graph TD'].concat(outside, subTopologies, topicSourcesList, topicSinksList, stateStoresList).join('\n');
    }
  }]);
  return AsciiToMermaid;
}();
var nameFunction = function nameFunction(value) {
  return value.replace(/-/g, '-<br>');
};
function generateTopology() {
  return _generateTopology.apply(this, arguments);
}
function _generateTopology() {
  _generateTopology = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var topologyFilePath, readmeFilePath, topologyString, readmeFileContent, mermaidGraphDefinition, updatedMermaidBlock, mermaidBlockRegex;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          try {
            topologyFilePath = core.getInput('topologyFilePath') || 'docs/topology/stream.txt';
            readmeFilePath = core.getInput('readmeFilePath') || 'README.md'; // Read the contents of topology/stream.txt file
            topologyString = fs.readFileSync(topologyFilePath, 'utf8');
            readmeFileContent = '';
            if (fs.existsSync(readmeFilePath)) {
              // Read the contents of README.md file
              readmeFileContent = fs.readFileSync(readmeFilePath, 'utf8');
            }

            // Generate mermaid graph
            mermaidGraphDefinition = AsciiToMermaid.toMermaid(topologyString);
            updatedMermaidBlock = "### Kafka Stream Topology\n```mermaid\n".concat(mermaidGraphDefinition, "\n```\n----"); // Check if the mermaid block exists in the README.md file
            mermaidBlockRegex = /### Kafka Stream Topology\n([\s\S]*?)\n----/;
            if (mermaidBlockRegex.test(readmeFileContent)) {
              // Replace the existing mermaid block in the README.md file with the updated content
              readmeFileContent = readmeFileContent.replace(mermaidBlockRegex, updatedMermaidBlock);
            } else {
              // Mermaid block doesn't exist, so append the updated mermaid block to the README.md file
              readmeFileContent += '\n' + updatedMermaidBlock;
            }

            // Write the updated content back to the README.md file
            fs.writeFileSync(readmeFilePath, readmeFileContent, 'utf-8');
            console.log('README.md updated successfully.');
          } catch (error) {
            console.error('An error occurred while updating the README.md:', error);
            process.exit(1);
          }
        case 1:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _generateTopology.apply(this, arguments);
}
generateTopology();