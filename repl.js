var fs = require("fs");
var path = require("path");
var repl = require("repl");
var littleLisp = require("./littlelisp").littleLisp;

var lispGlobal = {};

var interpretIni = function () {
  var data = null;
  var fileName = process.argv.length > 2 ? process.argv.pop() : '';
  if (fileName) {
    data = fs.readFileSync(path.join('./' + fileName), 'utf-8');
  }
  repl.start({
    prompt: "> ",
    eval: function(cmd, context, filename, callback) {
      if (cmd !== "(\n)") {
        var programString = data || cmd;
        var ret = littleLisp.interpret(littleLisp.parse(programString), lispGlobal);
        // var ret = littleLisp.parse(cmd);
        callback(null, ret);
      } else {
        callback(null);
      }
    }
  });
}

interpretIni()

