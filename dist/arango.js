!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.arango=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jshint browserify: true */
"use strict";

module.exports = require('./lib/database');

},{"./lib/database":5}],2:[function(require,module,exports){
'use strict';
var extend = require('extend'), ArangoError = require('./error'), promisify = require('./util/promisify');
module.exports = Collection;
function update(self, data) {
    for (var key in data) {
        if (data.hasOwnProperty(key))
            self[key] = data[key];
    }
}
function Collection(connection, body) {
    this._connection = connection;
    update(this, body);
}
extend(Collection.prototype, {
    _get: function (path, update, callback) {
        var self = this;
        return promisify(callback, function (resolve, reject) {
            self._connection.get('collection/' + self.name + '/' + path, function (err, body) {
                if (err)
                    reject(err);
                else {
                    if (update)
                        update(self, body);
                    resolve(body);
                }
            });
        });
    },
    _put: function (path, data, update, callback) {
        var self = this;
        return promisify(callback, function (resolve, reject) {
            self._connection.put('collection/' + self.name + '/' + path, data, function (err, body) {
                if (err)
                    reject(err);
                else {
                    if (update)
                        update(self, body);
                    resolve(body);
                }
            });
        });
    },
    properties: function (callback) {
        return this._get('properties', true, callback);
    },
    count: function (callback) {
        return this._get('count', true, callback);
    },
    revision: function (callback) {
        return this._get('revision', true, callback);
    },
    checksum: function (callback) {
        return this._get('checksum', true, callback);
    },
    load: function (count, callback) {
        if (typeof count === 'function') {
            callback = count;
            count = undefined;
        }
        return this._put('load', typeof count === 'boolean' ? { count: count } : undefined, true, callback);
    },
    unload: function (callback) {
        return this._put('unload', undefined, true, callback);
    },
    setProperties: function (properties, callback) {
        return this._put('properties', properties, true, callback);
    },
    rename: function (name, callback) {
        return this._put('rename', { name: name }, true, callback);
    },
    rotate: function (callback) {
        return this._put('rotate', undefined, false, callback);
    },
    truncate: function (callback) {
        return this._put('truncate', undefined, true, callback);
    },
    'delete': function (callback) {
        var self = this;
        return promisify(callback, function (resolve, reject) {
            self._connection['delete']('collection/' + self.name, function (err, body) {
                if (err)
                    reject(err);
                else if (body.error)
                    reject(new ArangoError(body));
                else
                    resolve(body);
            });
        });
    }
});
},{"./error":6,"./util/promisify":7,"extend":14}],3:[function(require,module,exports){
'use strict';
var extend = require('extend'), request = require('request');
module.exports = Connection;
function Connection(config) {
    if (typeof config === 'string') {
        config = { url: config };
    }
    this.config = extend({}, Connection.defaults, config);
}
Connection.defaults = {
    url: 'http://localhost:8529',
    databaseName: '_system'
};
extend(Connection.prototype, {
    request: function (opts, callback) {
        var body = opts.body, headers = { 'content-type': 'text/plain' };
        if (body && typeof body === 'object') {
            body = JSON.stringify(body);
            headers['content-type'] = 'application/json';
        }
        request({
            url: this.config.url + '/_db/' + this.config.databaseName + '/_api/' + opts.path,
            auth: opts.auth || this.config.auth,
            headers: extend(headers, this.config.headers, opts.headers),
            method: (opts.method || 'get').toUpperCase(),
            qs: opts.qs,
            body: body,
            encoding: 'utf-8'
        }, function (err, response, body) {
            if (err)
                callback(err);
            else {
                try {
                    callback(null, body ? JSON.parse(body) : null);
                } catch (e) {
                    callback(e);
                }
            }
        });
    },
    get: function (path, data, callback) {
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            qs: data
        }, callback);
    },
    post: function (path, data, qs, callback) {
        if (typeof qs === 'function') {
            callback = qs;
            qs = undefined;
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            body: data,
            qs: qs,
            method: 'post'
        }, callback);
    },
    put: function (path, data, qs, callback) {
        if (typeof qs === 'function') {
            callback = qs;
            qs = undefined;
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            body: data,
            qs: qs,
            method: 'put'
        }, callback);
    },
    patch: function (path, data, qs, callback) {
        if (typeof qs === 'function') {
            callback = qs;
            qs = undefined;
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            body: data,
            qs: qs,
            method: 'patch'
        }, callback);
    },
    'delete': function (path, data, callback) {
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            qs: data,
            method: 'delete'
        }, callback);
    },
    head: function (path, data, callback) {
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            qs: data,
            method: 'head'
        }, callback);
    }
});
},{"extend":14,"request":9}],4:[function(require,module,exports){
/*jshint browserify: true */
"use strict";

var extend = require('extend'),
  ArangoError = require('./error'),
  promisify = require('./util/promisify');

module.exports = ArrayCursor;

function ArrayCursor(connection, body) {
  this._connection = connection;
  this._result = body.result;
  this._hasMore = Boolean(body.hasMore);
  this._id = body.id;
  this._current = 0;
}

extend(ArrayCursor.prototype, {
  _drain: function (callback) {
    var self = this;
    self._more(function (err) {
      if (err) callback(err);
      else if (!self._hasMore) callback(null, self);
      else self._drain(callback);
    });
  },
  _more: function (callback) {
    var self = this;
    if (!self._hasMore) callback(null, self);
    else {
      self._connection.put('cursor/' + this._id, function (err, body) {
        if (err) callback(err);
        else if (body.error) callback(new ArangoError(body));
        else {
          self._result.push.apply(self._result, body.result);
          self._hasMore = body.hasMore;
          callback(null, self);
        }
      });
    }
  },
  all: function (callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._drain(function (err) {
        if (err) reject(err);
        else resolve(self._result);
      });
    });
  },
  next: function (callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      function next() {
        var value = self._result[self._current];
        self._current += 1;
        resolve(value);
      }
      if (self._current < self._result.length) next();
      else {
        if (!self._hasMore) resolve();
        else {
          self._more(function (err) {
            if (err) reject(err);
            else next();
          });
        }
      }
    });
  },
  hasNext: function () {
    return (this._hasMore || this._current < this._result.length);
  },
  each: function (fn, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._drain(function (err) {
        if (err) reject(err);
        else {
          try {
            var i, result;
            for (i = 0; i < self._result.length; i++) {
              result = fn(self._result[i], i, self);
              if (result === false) break;
            }
            resolve(self);
          }
          catch (e) {reject(e);}
        }
      });
    });
  },
  every: function (fn, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      function step(x) {
        try {
          var i, result = true;
          for (i = x; i < self._result.length; i++) {
            result = fn(self._result[i], i, self);
            if (!result) break;
          }
          if (!self._hasMore || !result) resolve(result);
          else {
            self._more(function (err) {
              if (err) reject(err);
              else step(i);
            });
          }
        }
        catch(e) {reject(e);}
      }
      step(0);
    });
  },
  some: function (fn, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      function step(x) {
        try {
          var i, result = false;
          for (i = x; i < self._result.length; i++) {
            result = fn(self._result[i], i, self);
            if (result) break;
          }
          if (!self._hasMore || result) resolve(result);
          else {
            self._more(function (err) {
              if (err) reject(err);
              else step(i);
            });
          }
        }
        catch(e) {reject(e);}
      }
      step(0);
    });
  },
  map: function (fn, callback) {
    var self = this,
      result = [];
    return promisify(callback, function (resolve, reject) {
      function step(x) {
        try {
          var i;
          for (i = x; i < self._result.length; i++) {
            result.push(fn(self._result[i], i, self));
          }
          if (!self._hasMore) resolve(result);
          else {
            self._more(function (err) {
              if (err) reject(err);
              else step(i);
            });
          }
        }
        catch(e) {reject(e);}
      }
      step(0);
    });
  },
  reduce: function (fn, accu, callback) {
    if (typeof accu === 'function') {
      callback = accu;
      accu = undefined;
    }
    var self = this;
    return promisify(callback, function (resolve, reject) {
      function step(x) {
        try {
          var i;
          for (i = x; i < self._result.length; i++) {
            accu = fn(accu, self._result[i], i, self);
          }
          if (!self._hasMore) resolve(accu);
          else {
            self._more(function (err) {
              if (err) reject(err);
              else step(i);
            });
          }
        }
        catch(e) {reject(e);}
      }
      if (accu !== undefined) step(0);
      else if (self._result.length > 1) {
        accu = self._result[0];
        step(1);
      }
      else {
        self._more(function (err) {
          if (err) reject(err);
          else {
            accu = self._result[0];
            step(1);
          }
        });
      }
    });
  }
});

},{"./error":6,"./util/promisify":7,"extend":14}],5:[function(require,module,exports){
/* jshint browserify: true, -W079 */
"use strict";

var Promise = require('promise-es6').Promise,
  extend = require('extend'),
  map = require('array-map'),
  Connection = require('./connection'),
  ArangoError = require('./error'),
  ArrayCursor = require('./cursor'),
  Collection = require('./collection'),
  promisify = require('./util/promisify');

module.exports = Database;

function Database(config) {
  if (!(this instanceof Database)) {
    return new Database(config);
  }
  this._connection = new Connection(config);
}

extend(Database.prototype, {
  use: function (databaseName) {
    this._connection.config.databaseName = databaseName;
  },
  createCollection: function (properties, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.post('collection', properties, function (err, body) {
        if (err) reject(err);
        else if (body.error) reject(new ArangoError(body));
        else resolve(new Collection(self._connection, body));
      });
    });
  },
  collection: function (collectionName, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.get('collection/' + collectionName, function (err, body) {
        if (err) reject(err);
        else if (body.error) {
          if (body.errorNum === 1203) {
            self.createCollection({name: collectionName})
            .then(resolve, reject);
          }
          else reject(new ArangoError(body));
        }
        else resolve(new Collection(self._connection, body));
      });
    });
  },
  collections: function (excludeSystem, callback) {
    if (typeof excludeSystem === 'function') {
      callback = excludeSystem;
      excludeSystem = undefined;
    }
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.get('collection', {
        excludeSystem: excludeSystem
      }, function (err, body) {
        if (err) reject(err);
        else if (body.error) reject(new ArangoError(body));
        else resolve(map(body.collections, function (data) {
          return new Collection(self._connection, data);
        }));
      });
    });
  },
  truncate: function (callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.get('collection', function (err, body) {
        if (err) reject(err);
        else if (body.error) reject(new ArangoError(body));
        else {
          Promise.all(map(
            body.collections,
            function (data) {
              return new Promise(function (resolve, reject) {
                self._connection.put('collection/' + data.name + '/truncate', function (err, body) {
                  if (err) reject(err);
                  else if (body.error) reject(new ArangoError(body));
                  else resolve(body);
                });
              });
            }
          )).then(resolve, reject);
        }
      });
      self.collections().then(function (collections) {
        Promise.all(map(collections, function (collection) {
          return collection.truncate();
        })).then(resolve, reject);
      }, reject);
    });
  },
  query: function (query, bindVars, callback) {
    if (typeof bindVars === 'function') {
      callback = bindVars;
      bindVars = undefined;
    }
    if (query && typeof query.toAQL === 'function') {
      query = query.toAQL();
    }
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.post('cursor', {
        query: query,
        bindVars: bindVars
      }, function (err, body) {
        if (err) reject(err);
        else if (body.error) reject(new ArangoError(body));
        else resolve(new ArrayCursor(self._connection, body));
      });
    });
  }
});

},{"./collection":2,"./connection":3,"./cursor":4,"./error":6,"./util/promisify":7,"array-map":8,"extend":14,"promise-es6":15}],6:[function(require,module,exports){
/*jshint browserify: true */
"use strict";

var util = require('util');

module.exports = ArangoError;

function ArangoError(obj) {
  this.message = obj.errorMessage;
  this.errorNum = obj.errorNum;
  this.code = obj.code;
  var err = new Error(this.message);
  err.name = 'ArangoError';
  if (err.fileName) this.fileName = err.fileName;
  if (err.lineNumber) this.lineNumber = err.lineNumber;
  if (err.columnNumber) this.columnNumber = err.columnNumber;
  if (err.stack) this.stack = err.stack;
  if (err.description) this.description = err.description;
  if (err.number) this.number = err.number;
}

util.inherits(ArangoError, Error);

},{"util":13}],7:[function(require,module,exports){
/*jshint browserify: true, -W079 */
"use strict";

var Promise = require('promise-es6').Promise;

module.exports = promisify;

function promisify(callback, deferred) {
  var promise = new Promise(deferred);
  if (callback) {
    return promise.then(
      function (result) {
        return callback(null, result);
      },
      function (reason) {
        return callback(reason);
      }
    );
  }
  return promise;
}

},{"promise-es6":15}],8:[function(require,module,exports){
module.exports = function (xs, f) {
    if (xs.map) return xs.map(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = xs[i];
        if (hasOwn.call(xs, i)) res.push(f(x, i, xs));
    }
    return res;
};

var hasOwn = Object.prototype.hasOwnProperty;

},{}],9:[function(require,module,exports){
// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var XHR = XMLHttpRequest
if (!XHR) throw new Error('missing XMLHttpRequest')
request.log = {
  'trace': noop, 'debug': noop, 'info': noop, 'warn': noop, 'error': noop
}

var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

//
// request
//

function request(options, callback) {
  // The entry-point to the API: prep the options object and pass the real work to run_xhr.
  if(typeof callback !== 'function')
    throw new Error('Bad callback given: ' + callback)

  if(!options)
    throw new Error('No options given')

  var options_onResponse = options.onResponse; // Save this for later.

  if(typeof options === 'string')
    options = {'uri':options};
  else
    options = JSON.parse(JSON.stringify(options)); // Use a duplicate for mutating.

  options.onResponse = options_onResponse // And put it back.

  if (options.verbose) request.log = getLogger();

  if(options.url) {
    options.uri = options.url;
    delete options.url;
  }

  if(!options.uri && options.uri !== "")
    throw new Error("options.uri is a required argument");

  if(typeof options.uri != "string")
    throw new Error("options.uri must be a string");

  var unsupported_options = ['proxy', '_redirectsFollowed', 'maxRedirects', 'followRedirect']
  for (var i = 0; i < unsupported_options.length; i++)
    if(options[ unsupported_options[i] ])
      throw new Error("options." + unsupported_options[i] + " is not supported")

  options.callback = callback
  options.method = options.method || 'GET';
  options.headers = options.headers || {};
  options.body    = options.body || null
  options.timeout = options.timeout || request.DEFAULT_TIMEOUT

  if(options.headers.host)
    throw new Error("Options.headers.host is not supported");

  if(options.json) {
    options.headers.accept = options.headers.accept || 'application/json'
    if(options.method !== 'GET')
      options.headers['content-type'] = 'application/json'

    if(typeof options.json !== 'boolean')
      options.body = JSON.stringify(options.json)
    else if(typeof options.body !== 'string')
      options.body = JSON.stringify(options.body)
  }
  
  //BEGIN QS Hack
  var serialize = function(obj) {
    var str = [];
    for(var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  }
  
  if(options.qs){
    var qs = (typeof options.qs == 'string')? options.qs : serialize(options.qs);
    if(options.uri.indexOf('?') !== -1){ //no get params
        options.uri = options.uri+'&'+qs;
    }else{ //existing get params
        options.uri = options.uri+'?'+qs;
    }
  }
  //END QS Hack
  
  //BEGIN FORM Hack
  var multipart = function(obj) {
    //todo: support file type (useful?)
    var result = {};
    result.boundry = '-------------------------------'+Math.floor(Math.random()*1000000000);
    var lines = [];
    for(var p in obj){
        if (obj.hasOwnProperty(p)) {
            lines.push(
                '--'+result.boundry+"\n"+
                'Content-Disposition: form-data; name="'+p+'"'+"\n"+
                "\n"+
                obj[p]+"\n"
            );
        }
    }
    lines.push( '--'+result.boundry+'--' );
    result.body = lines.join('');
    result.length = result.body.length;
    result.type = 'multipart/form-data; boundary='+result.boundry;
    return result;
  }
  
  if(options.form){
    if(typeof options.form == 'string') throw('form name unsupported');
    if(options.method === 'POST'){
        var encoding = (options.encoding || 'application/x-www-form-urlencoded').toLowerCase();
        options.headers['content-type'] = encoding;
        switch(encoding){
            case 'application/x-www-form-urlencoded':
                options.body = serialize(options.form).replace(/%20/g, "+");
                break;
            case 'multipart/form-data':
                var multi = multipart(options.form);
                //options.headers['content-length'] = multi.length;
                options.body = multi.body;
                options.headers['content-type'] = multi.type;
                break;
            default : throw new Error('unsupported encoding:'+encoding);
        }
    }
  }
  //END FORM Hack

  // If onResponse is boolean true, call back immediately when the response is known,
  // not when the full request is complete.
  options.onResponse = options.onResponse || noop
  if(options.onResponse === true) {
    options.onResponse = callback
    options.callback = noop
  }

  // XXX Browsers do not like this.
  //if(options.body)
  //  options.headers['content-length'] = options.body.length;

  // HTTP basic authentication
  if(!options.headers.authorization && options.auth)
    options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);

  return run_xhr(options)
}

var req_seq = 0
function run_xhr(options) {
  var xhr = new XHR
    , timed_out = false
    , is_cors = is_crossDomain(options.uri)
    , supports_cors = ('withCredentials' in xhr)

  req_seq += 1
  xhr.seq_id = req_seq
  xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
  xhr._id = xhr.id // I know I will type "_id" from habit all the time.

  if(is_cors && !supports_cors) {
    var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri)
    cors_err.cors = 'unsupported'
    return options.callback(cors_err, xhr)
  }

  xhr.timeoutTimer = setTimeout(too_late, options.timeout)
  function too_late() {
    timed_out = true
    var er = new Error('ETIMEDOUT')
    er.code = 'ETIMEDOUT'
    er.duration = options.timeout

    request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
    return options.callback(er, xhr)
  }

  // Some states can be skipped over, so remember what is still incomplete.
  var did = {'response':false, 'loading':false, 'end':false}

  xhr.onreadystatechange = on_state_change
  xhr.open(options.method, options.uri, true) // asynchronous
  if(is_cors)
    xhr.withCredentials = !! options.withCredentials
  xhr.send(options.body)
  return xhr

  function on_state_change(event) {
    if(timed_out)
      return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

    request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

    if(xhr.readyState === XHR.OPENED) {
      request.log.debug('Request started', {'id':xhr.id})
      for (var key in options.headers)
        xhr.setRequestHeader(key, options.headers[key])
    }

    else if(xhr.readyState === XHR.HEADERS_RECEIVED)
      on_response()

    else if(xhr.readyState === XHR.LOADING) {
      on_response()
      on_loading()
    }

    else if(xhr.readyState === XHR.DONE) {
      on_response()
      on_loading()
      on_end()
    }
  }

  function on_response() {
    if(did.response)
      return

    did.response = true
    request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
    clearTimeout(xhr.timeoutTimer)
    xhr.statusCode = xhr.status // Node request compatibility

    // Detect failed CORS requests.
    if(is_cors && xhr.statusCode == 0) {
      var cors_err = new Error('CORS request rejected: ' + options.uri)
      cors_err.cors = 'rejected'

      // Do not process this request further.
      did.loading = true
      did.end = true

      return options.callback(cors_err, xhr)
    }

    options.onResponse(null, xhr)
  }

  function on_loading() {
    if(did.loading)
      return

    did.loading = true
    request.log.debug('Response body loading', {'id':xhr.id})
    // TODO: Maybe simulate "data" events by watching xhr.responseText
  }

  function on_end() {
    if(did.end)
      return

    did.end = true
    request.log.debug('Request done', {'id':xhr.id})

    xhr.body = xhr.responseText
    if(options.json) {
      try        { xhr.body = JSON.parse(xhr.responseText) }
      catch (er) { return options.callback(er, xhr)        }
    }

    options.callback(null, xhr, xhr.body)
  }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

//
// defaults
//

request.defaults = function(options, requester) {
  var def = function (method) {
    var d = function (params, callback) {
      if(typeof params === 'string')
        params = {'uri': params};
      else {
        params = JSON.parse(JSON.stringify(params));
      }
      for (var i in options) {
        if (params[i] === undefined) params[i] = options[i]
      }
      return method(params, callback)
    }
    return d
  }
  var de = def(request)
  de.get = def(request.get)
  de.post = def(request.post)
  de.put = def(request.put)
  de.head = def(request.head)
  return de
}

//
// HTTP method shortcuts
//

var shortcuts = [ 'get', 'put', 'post', 'head' ];
shortcuts.forEach(function(shortcut) {
  var method = shortcut.toUpperCase();
  var func   = shortcut.toLowerCase();

  request[func] = function(opts) {
    if(typeof opts === 'string')
      opts = {'method':method, 'uri':opts};
    else {
      opts = JSON.parse(JSON.stringify(opts));
      opts.method = method;
    }

    var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
    return request.apply(this, args);
  }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
  if(typeof options === 'string')
    options = {'uri':options}

  // Just use the request API to do JSON.
  options.json = true
  if(options.body)
    options.json = options.body
  delete options.body

  callback = callback || noop

  var xhr = request(options, couch_handler)
  return xhr

  function couch_handler(er, resp, body) {
    if(er)
      return callback(er, resp, body)

    if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
      // The body is a Couch JSON object indicating the error.
      er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
      for (var key in body)
        er[key] = body[key]
      return callback(er, resp, body);
    }

    return callback(er, resp, body);
  }
}

//
// Utility
//

function noop() {}

function getLogger() {
  var logger = {}
    , levels = ['trace', 'debug', 'info', 'warn', 'error']
    , level, i

  for(i = 0; i < levels.length; i++) {
    level = levels[i]

    logger[level] = noop
    if(typeof console !== 'undefined' && console && console[level])
      logger[level] = formatted(console, level)
  }

  return logger
}

function formatted(obj, method) {
  return formatted_logger

  function formatted_logger(str, context) {
    if(typeof context === 'object')
      str += ' ' + JSON.stringify(context)

    return obj[method].call(obj, str)
  }
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
  var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/

  // jQuery #8138, IE may throw an exception when accessing
  // a field from window.location if document.domain has been set
  var ajaxLocation
  try { ajaxLocation = location.href }
  catch (e) {
    // Use the href attribute of an A element since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
  }

  var ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
    , parts = rurl.exec(url.toLowerCase() )

  var result = !!(
    parts &&
    (  parts[1] != ajaxLocParts[1]
    || parts[2] != ajaxLocParts[2]
    || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
    )
  )

  //console.debug('is_crossDomain('+url+') -> ' + result)
  return result
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
        break;
        case 2:
            enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
}
module.exports = request;

},{}],10:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],11:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],12:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],13:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":12,"_process":11,"inherits":10}],14:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	"use strict";
	if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval) {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	"use strict";
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === "boolean") {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if (typeof target !== "object" && typeof target !== "function" || target == undefined) {
			target = {};
	}

	for (; i < length; ++i) {
		// Only deal with non-null/undefined values
		if ((options = arguments[i]) != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],15:[function(require,module,exports){

var utils = require('./utils');

// Get a reference to the global scope. We do this instead of using {global}
// in case someone decides to bundle this up and use it in the browser
var _global = (function() { return this; }).call();

// 
// Install the Promise constructor into the global scope, if and only if a
// native promise constructor does not exist.
// 
exports.install = function() {
	if (! _global.Promise) {
		_global.Promise = Promise;
	}
};

// 
// Remove global.Promise, but only if it is our version
// 
exports.uninstall = function() {
	if (_global.Promise && _global.Promise === Promise) {
		_global.Promise = void(0);
		delete _global.Promise;
	}
};

// 
// State constants
// 
var PENDING      = void(0);
var UNFULFILLED  = 0;
var FULFILLED    = 1;
var FAILED       = 2;

// 
// The Promise constructor
// 
// @param {callback} the callback that defines the process to occur
// 
var Promise = exports.Promise = function(callback) {
	// Check that a function argument was given
	if (typeof callback !== 'function') {
		throw new TypeError('Promise constructor takes a function argument');
	}

	// Check that a new instance was created, and not just a function call was made
	if (! (this instanceof Promise)) {
		throw new TypeError('Failed to construct \'Promise\': Please use the \'new\' operator, this object constructor cannot be called as a function.');
	}

	var self = this;

	// The queue of functions waiting for the promise to resolve/reject
	utils.defineProperty(this, 'funcs', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: [ ]
	});

	// The queue of functions waiting for the promise to resolve/reject
	utils.defineProperty(this, 'value', {
		enumerable: false,
		configurable: true,
		writable: false,
		value: void(0)
	});

	// Call the function, passing in the resolve and reject functions
	try {
		callback(resolve, reject);
	} catch (err) {
		reject(err);
	}

	// The {resolve} callback given to the handler function
	function resolve(value) {
		resolvePromise(self, value);
	}

	// The {reject} callback given to the handler function
	function reject(value) {
		rejectPromise(self, value);
	}
};

// --------------------------------------------------------

// 
// Assigns handler function(s) for the resolve/reject events
// 
// @param {onResolve} optional; a function called when the promise resolves
// @param {onReject} optional; a function called when the promise rejects
// @return Promise
// 
Promise.prototype.then = function(onResolve, onReject) {
	var self = this;

	// Create the new promise that will be returned
	var promise = new Promise(function( ) { });

	// If the promise is already completed, call the callback immediately
	if (this.state) {
		setImmediate(function() {
			invokeFunction(self, promise, (self.state === FULFILLED ? onResolve : onReject));
		});
	}

	// Otherwise, add the functions to the list
	else {
		this.funcs.push(promise, onResolve, onReject);
	}

	return promise;
};

// 
// Assigns a handler function for the reject event
// 
// @param {onReject} a function called when the promise rejects
// @return Promise
// 
Promise.prototype.catch = function(onReject) {
	return this.then(null, onReject);
};

// --------------------------------------------------------

// 
// Returns an immediately resolving promise which resolves with {value}. If {value} is
// a thenable, the new promise will instead follow the given thenable.
// 
// @param {value} the value to resolve with
// @return Promise
// 
Promise.resolve = function(value) {
	try {
		var then = utils.thenable(value);
	} catch (err) {
		return new Promise(autoResolve);
	}

	var callback = then
		? function(resolve, reject) {
			then.call(value, resolve, reject);
		}
		: autoResolve;

	function autoResolve(resolve) {
		resolve(value);
	}

	return new Promise(callback);
};

// 
// Returns an immediately rejected promise
// 
// @param {reason} the reason for the rejection
// @return Promise
// 
Promise.reject = function(reason) {
	return new Promise(function(resolve, reject) {
		reject(reason);
	});
};

// 
// Returns a new promise which resolves/rejects based on an array of given promises
// 
// @param {promises} the promises to handle
// @return Promise
// 
Promise.all = function(promises) {
	return new Promise(function(resolve, reject) {
		if (! Array.isArray(promises)) {
			resolve([ ]);
			return;
		}

		var values = [ ];
		var finished = false;
		var remaining = promises.length;
		
		promises.forEach(function(promise, index) {
			var then = utils.thenable(promise);

			if (! then) {
				onResolve(promise);
				return;
			}

			then.call(promise,
				function onResolve(value) {
					remaining--;
					values[index] = value;
					checkIfFinished();
				},
				function onReject(reason) {
					finished = true;
					reject(reason);
				}
			);
		});

		function checkIfFinished() {
			if (! finished && ! remaining) {
				finished = true;
				resolve(values);
			}
		}
	});
};

// 
// Returns a new promise which resolve/rejects as soon as the first given promise resolves
// or rejects
// 
// @param {promises} an array of promises
// @return Promise
// 
Promise.race = function(promises) {
	var promise = new Promise(function() { });

	promises.forEach(function(childPromise) {
		childPromise.then(
			function(value) {
				resolvePromise(promise, value);
			},
			function(value) {
				rejectPromise(promise, value);
			}
		);
	});

	return promise;
};

// --------------------------------------------------------

// 
// Determines how to properly resolve the promise
// 
// @param {promise} the promise
// @param {value} the value to give the promise
// @return void
// 
function resolvePromise(promise, value) {
	if (! handleThenable(promise, value)) {
		fulfillPromise(promise, value);
	}
}

// 
// When a promise resolves with another thenable, this function handles delegating control
// and passing around values
// 
// @param {child} the child promise that values will be passed to
// @param {value} the thenable value from the previous promise
// @return boolean
// 
function handleThenable(promise, value) {
	var done, then;

	// Attempt to get the `then` method from the thenable (if it is a thenable)
	try {
		if (! (then = utils.thenable(value))) {
			return false;
		}
	} catch (err) {
		rejectPromise(promise, err);
		return true;
	}
	
	// Ensure that the promise did not attempt to fulfill with itself
	if (promise === value) {
		rejectPromise(promise, new TypeError('Circular resolution of promises'));
		return true;
	}

	try {
		// Wait for the thenable to fulfill/reject before moving on
		then.call(value,
			function(subValue) {
				if (! done) {
					done = true;

					// Once again look for circular promise resolution
					if (value === subValue) {
						rejectPromise(promise, new TypeError('Circular resolution of promises'));
						return;
					}

					resolvePromise(promise, subValue);
				}
			},
			function(subValue) {
				if (! done) {
					done = true;

					rejectPromise(promise, subValue);
				}
			}
		);
	} catch (err) {
		if (! done) {
			done = true;

			rejectPromise(promise, err);
		}
	}

	return true;
}

// 
// Fulfill the given promise
// 
// @param {promise} the promise to resolve
// @param {value} the value of the promise
// @return void
// 
function fulfillPromise(promise, value) {
	if (promise.state !== PENDING) {return;}

	setValue(promise, value);
	setState(promise, UNFULFILLED);

	setImmediate(function() {
		setState(promise, FULFILLED);
		invokeFunctions(promise);
	});
}

// 
// Reject the given promise
// 
// @param {promise} the promise to reject
// @param {value} the value of the promise
// @return void
// 
function rejectPromise(promise, value) {
	if (promise.state !== PENDING) {return;}

	setValue(promise, value);
	setState(promise, UNFULFILLED);

	setImmediate(function() {
		setState(promise, FAILED);
		invokeFunctions(promise);
	});
}

// 
// Set the state of a promise
// 
// @param {promise} the promise to modify
// @param {state} the new state
// @return void
// 
function setState(promise, state) {
	utils.defineProperty(promise, 'state', {
		enumerable: false,
		// According to the spec: If the state is UNFULFILLED (0), the state can be changed;
		// If the state is FULFILLED (1) or FAILED (2), the state cannot be changed, and therefore we
		// lock the property
		configurable: (! state),
		writable: false,
		value: state
	});
}

// 
// Set the value of a promise
// 
// @param {promise} the promise to modify
// @param {value} the value to store
// @return void
// 
function setValue(promise, value) {
	utils.defineProperty(promise, 'value', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: value
	});
}

// 
// Invoke all existing functions queued up on the promise
// 
// @param {promise} the promise to run functions for
// @return void
// 
function invokeFunctions(promise) {
	var funcs = promise.funcs;

	for (var i = 0, c = funcs.length; i < c; i += 3) {
		invokeFunction(promise, funcs[i], funcs[i + promise.state]);
	}

	// Empty out this list of functions as no one function will be called
	// more than once, and we don't want to hold them in memory longer than needed
	promise.funcs.length = 0;
}

// 
// Invoke one specific function for the promise
// 
// @param {promise} the promise the function belongs too (that .then was called on)
// @param {child} the promise return from the .then call; the next in line
// @param {func} the function to call
// @return void
// 
function invokeFunction(promise, child, func) {
	var value = promise.value;
	var state = promise.state;

	// If we have a function to run, run it
	if (typeof func === 'function') {
		try {
			value = func(value);
		} catch (err) {
			rejectPromise(child, err);
			return;
		}
		
		resolvePromise(child, value);
	}

	else if (state === FULFILLED) {
		resolvePromise(child, value);
	}

	else if (state === FAILED) {
		rejectPromise(child, value);
	}
}

},{"./utils":16}],16:[function(require,module,exports){

var _global = (function() { return this; }).call();

// 
// If the given value is a valid thenable, return the then method; otherwise, return false
// 
exports.thenable = function(value) {
	if (value && (typeof value === 'object' || typeof value === 'function')) {
		try {
			var then = value.then;
		} catch (err) {
			throw err;
		}

		if (typeof then === 'function') {
			return then;
		}
	}

	return false;
}

// 
// Shim Object.defineProperty if needed; This will never run in Node.js land, but
// is here for when we browserify
// 
exports.defineProperty = function(obj, prop, opts) {
	if (Object.defineProperty) {
		try {
			return Object.defineProperty(obj, prop, opts);
		} catch (err) { }
	}
	
	if (opts.value) {
		obj[prop] = opts.value;
	}
};

// 
// setImmediate shim
// 
if (! _global.setImmediate) {
	_global.setImmediate = function(func) {
		setTimeout(func, 0);
	};
}

exports.log = function(obj) {
	console.log(
		require('util').inspect(obj, {
			colors: true,
			showHidden: true,
			depth: 2
		})
	)
};

},{"util":13}]},{},[1])(1)
});