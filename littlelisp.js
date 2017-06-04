;(function(exports) {
  var globalCtx = {}

  var library = {
    first: function(x) {
      return x[0];
    },

    rest: function(x) {
      return x.slice(1);
    },

    print: function(x) {
      return x;
    }
  };

  var alpha = function (input, scope) {
    if (input && input instanceof Array) {
      input.map(function(item) {
        if (scope[item.value] && item.type === "identifier") {
          item.value = scope[item.value];
          item.type = categorize(item.value).type;
          return item;
        } else {
          alpha(item, scope);
        }
      });
    }
    return input;
  }

  var Context = function(scope, parent) {
    this.scope = scope;
    this.parent = parent;

    this.get = function(identifier) {
      if (identifier in this.scope) {
        return this.scope[identifier];
      } else if (this.parent !== undefined) {
        return this.parent.get(identifier);
      }
    };
  };

  /**
   *  TODO: LISP中不同关键字映射的操作
   */
  var special = {
    let: function(input, context) {
      var letContext = input[1].reduce(function(acc, x) {
        acc.scope[x[0].value] = interpret(x[1], context);
        return acc;
      }, new Context({}, context));

      input[2] = alpha(input[2], letContext.scope)
      
      return interpret(input[2], letContext);
    },

    /**
     * lambdaArguments为传入lambda表达式的实际参数 以 ((lambda (x y) (+ x y)) 1 2) 为例 lambdaArguments 是 1 2
     * 其中第一个 [ { type: 'identifier', value: 'x' }, { type: 'identifier', value: 'y' } ] 是lambda的参数
     * 第二个事lambda表达式中的 body 
     * 
     * [ [ { type: 'identifier', value: 'lambda' },
     *    [ { type: 'identifier', value: 'x' },
     *       { type: 'identifier', value: 'y' } ],
     *     [ { type: 'identifier', value: 'x' },
     *       { type: 'identifier', value: 'y' } ] ],
     *   { type: 'number', value: 1 },
     *   { type: 'number', value: 2 } ]
     * 
     *  最终将传入的参数转化)成键值对的形式
     * 
     */
    lambda: function(input, context) {
      return function() {
        var lambdaArguments = arguments;
        var lambdaScope = input[1].reduce(function(acc, x, i) {
          acc[x.value] = lambdaArguments[i];
          return acc;
        }, {});
        
        input[2] = alpha(input[2], lambdaScope)

        return interpret(input[2], new Context(lambdaScope, context));
      };
    },

    if: function(input, context) {
      var condition = interpret(input[1], context);
      if (condition === '!FALSE' || condition === undefined || condition === 0) {
        return interpret(input[3], context);
      } else {
        return interpret(input[2], context);
      }
    },

    '<': function(input, context) {
      var preValue = interpret(input[1], context);
      var befValue = interpret(input[2], context);
      preValue = isNaN(parseFloat(preValue)) ? preValue.value : preValue;
      befValue = isNaN(parseFloat(befValue)) ? befValue.value : befValue;
      return preValue < befValue ? '!TRUE' : '!FALSE';
    },

    '>': function(input, context) {
      var preValue = interpret(input[1], context);
      var befValue = interpret(input[2], context);
      preValue = isNaN(parseFloat(preValue)) ? preValue.value : preValue;
      befValue = isNaN(parseFloat(befValue)) ? befValue.value : befValue;
      return preValue > befValue ? '!TRUE' : '!FALSE';
    },

    '+': function(input, context) {
      return input.slice(1).reduce(function(acc, statement) {
        if (statement instanceof Array) {
          return categorize(acc.value + parseFloat(interpret(statement, context).value));
        } else {
          return categorize(parseFloat(acc.value) + parseFloat(statement.value));
        }
      }, categorize(0));
    },

    '-': function(input, context) {
      var ini = input[1] instanceof Array ? categorize(interpret(input[1]).value) : categorize(input[1].value);
      return input.slice(2).reduce(function(acc, statement) {
        if (statement instanceof Array) {
          return categorize(parseFloat(acc.value) - parseFloat(interpret(statement, context).value));
        } else {
          return categorize(parseFloat(acc.value) - parseFloat(statement.value));
        }
      }, ini);
    },

    '*': function(input, context) {
      return input.slice(1).reduce(function(acc, statement) {
        if (statement instanceof Array) {
          return categorize(parseFloat(acc.value) * parseFloat(interpret(statement, context).value));
        } else {
          return categorize(parseFloat(acc.value) * parseFloat(statement.value));
        }
      }, categorize(1));
    },

    '/': function(input, context) {
      var ini = input[1] instanceof Array ? categorize(interpret(input[1]).value) : categorize(input[1].value);
      return input.slice(2).reduce(function(acc, statement) {
        if (statement instanceof Array) {
          return categorize(parseFloat(acc.value) / parseFloat(interpret(statement, context).value));
        } else {
          return categorize(parseFloat(acc.value) / parseFloat(statement.value));
        }
      }, ini);
    }
  };

  /**
   * @param {*} input 
   * @param {*} context
   * 
   * (+ (+ 1 9) 2)
   *
   * [ { type: 'identifier', value: '+' },
   *  [ { type: 'identifier', value: '+' },
   *    { type: 'number', value: 1 },
   *    { type: 'number', value: 9 } ],
   *  { type: 'number', value: 2 } ]
   *  
   */
  var interpretList = function(input, context) {
    if (input.length > 0 && input[0].value in special) {
      return special[input[0].value](input, context);
    } else {
      var list = input.map(function(x) { return interpret(x, context); });
      if (globalCtx && list[0] in globalCtx) {
        var funCode = globalCtx[list[0]]();
        var eval = funCode instanceof Array ? [funCode].concat(input.slice(1)) : funCode;
        return interpret(eval, context)
      } else if (list[0] instanceof Function) {
        return list[0].apply(undefined, list.slice(1));
      } else {
        return list;
      }
    }
  };

  var interpret = function(input, context) {
    if (context === undefined) {
      return interpret(input, new Context(library));
    } else if (input instanceof Array) {
      return interpretList(input, context);
    } else if (input.type === "identifier") {
      return context.get(input.value);
    } else if (input.type === "number" || input.type === "string") {
      return input.value;
    }
  };

  var polyfill = function(input, context) {
    globalCtx = context;
    var global = Object.assign(new Context(library), context);
    var result = interpret(input, global);
    if (result && result.type === "number" || result.type === "string") {
      return result.value;
    } else {
      return result
    }
  }

  /**
   * @param {*} input lisp语言的单个字符
   * 
   * TODO: 根据单个字符判断字符的类型 number string identifier
   */
  var categorize = function(input) {
    if (!isNaN(parseFloat(input))) {
      return { type:'number', value: parseFloat(input) };
    } else if (input[0] === '"' && input.slice(-1) === '"') {
      return { type:'string', value: input.slice(1, -1) };
    } else {
      return { type:'identifier', value: input };
    }
  };

  /**
   * @param {String} input 预处理好的词法单元
   * @param {Array} list   表达式的环境
   * 
   * TODO: parenthesize 函数根据括号将表达式拆分成表达式树的形式
   */
  var parenthesize = function(input, list) {
    if (list === undefined) {
      return parenthesize(input, []);
    } else {
      var token = input.shift();
      if (token === undefined) {
        return list.pop();
      } else if (token === "(") {
        list.push(parenthesize(input, []));
        return parenthesize(input, list);
      } else if (token === ")") {
        return list;
      } else {
        /**
         * 前缀表达式的优点之一就是适用于带有任意个参数的过程
         * list.concat 就是将表达式中的多个词法序列连接到一起，形成一个表达式的解析
         */ 
        return parenthesize(input, list.concat(categorize(token)));
      }
    }
  };

  /**
   * @param {String} input lisp程序字符串
   * 
   * TODO: tokenize 函数接受一个完整的lisp程序字符串
   *  
   * 接受形如 (+ 1 2) 这样的完整字符串，其中判断标识符是不是在字符串中的方法非常巧妙
   * 因为程序中的字符串都是用双引号包裹，最外层用单引号包裹，所以可以根据奇偶数判断是不是在字符串中
   */

  var tokenize = function(input) {
    return input.split('"')
                .map(function(x, i) {
                   if (i % 2 === 0) { // not in string
                     return x.replace(/\(/g, ' ( ')
                             .replace(/\)/g, ' ) ');
                   } else { // in string
                     return x.replace(/ /g, "!whitespace!");
                   }
                 })
                .join('"')
                .trim()
                .split(/\s+/)
                .map(function(x) {
                  return x.replace(/!whitespace!/g, " ");
                });
  };

  var parse = function(input) {
    return parenthesize(tokenize(input));
  };

  exports.littleLisp = {
    parse: parse,
    interpret: polyfill
  };
})(typeof exports === 'undefined' ? this : exports);
