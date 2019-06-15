'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _regeneratorRuntime = _interopDefault(require('babel-runtime/regenerator'));
var _asyncToGenerator = _interopDefault(require('babel-runtime/helpers/asyncToGenerator'));
var _Object$keys = _interopDefault(require('babel-runtime/core-js/object/keys'));
var _Promise = _interopDefault(require('babel-runtime/core-js/promise'));
var _Object$assign = _interopDefault(require('babel-runtime/core-js/object/assign'));
var _classCallCheck = _interopDefault(require('babel-runtime/helpers/classCallCheck'));
var _createClass = _interopDefault(require('babel-runtime/helpers/createClass'));
var bunyan = _interopDefault(require('bunyan'));
var mongoose = _interopDefault(require('mongoose'));
var axios = _interopDefault(require('axios'));
var uniqid = _interopDefault(require('uniqid'));
var _ = _interopDefault(require('lodash'));
var jwt = _interopDefault(require('jsonwebtoken'));
var bcrypt = _interopDefault(require('bcryptjs'));
var Promise = _interopDefault(require('bluebird'));
var nodemailer = _interopDefault(require('nodemailer'));
var smtpTransport = _interopDefault(require('nodemailer-smtp-transport'));

global.__DEV__ = true;
// __STAGE__
global.__PROD__ = false;

var config = {
  name: 'Your super app',
  port: 3001,
  db: {
    url: 'mongodb://localhost/test'
  },
  jwt: {
    secret: 'YOUR_SECRET'
  },
  nodemailer: {
    service: 'mail',
    host: 'smtp.mail.ru',
    auth: {
      user: 'molodoyrustik@mail.ru',
      pass: 'molodoy'
    }
  }
};

var LogSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true
  },
  flag: {
    type: Boolean
  },
  status: {
    type: String,
    trimg: true
  },
  statusText: {
    type: String,
    trimg: true
  },
  time: {
    type: Number
  }
});

var DomainSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    trim: true
  },
  channels: [],
  logs: [LogSchema]
});

var ChannelSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    trim: true
  },
  endpoint: {
    type: String,
    trim: true
  }
});

var bcryptGenSalt = Promise.promisify(bcrypt.genSalt);
var bcryptHash = Promise.promisify(bcrypt.hash);
var bcryptCompare = Promise.promisify(bcrypt.compare);
var User = (function (ctx) {
  if (!ctx.log) throw '!log';

  var schema = new mongoose.Schema({
    email: {
      type: String,
      required: true,
      trim: true
    },
    id: {
      type: String,
      trim: true
    },
    password: {
      type: String
    },
    domains: [DomainSchema],
    channels: [ChannelSchema]
  }, {
    collection: 'user',
    timestamps: true
  });

  schema.statics.isValidEmail = function (email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  };
  schema.statics.generatePassword = function () {
    var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

    return Math.random().toString(36).substr(2, length);
  };
  schema.methods.toJSON = function () {
    return _.omit(this.toObject(), ['password']);
  };
  schema.methods.getIdentity = function (params) {
    var object = _.pick(this.toObject(), ['_id', 'email', 'id']);
    if (!params) return object;
    return _Object$assign(object, params);
  };
  schema.methods.generateAuthToken = function (params) {
    return jwt.sign(this.getIdentity(params), ctx.config.jwt.secret);
  };
  schema.methods.verifyPassword = function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(password) {
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return bcryptCompare(password, this.password);

            case 2:
              return _context.abrupt('return', _context.sent);

            case 3:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function (_x2) {
      return _ref.apply(this, arguments);
    };
  }();

  var SALT_WORK_FACTOR = 10;
  schema.pre('save', function (next) {
    var _this = this;

    if (!this.isModified('password')) return next();
    return bcryptGenSalt(SALT_WORK_FACTOR).then(function (salt) {
      bcryptHash(_this.password, salt).then(function (hash) {
        _this.password = hash;
        next();
      });
    }).catch(next);
  });

  return mongoose.model('User', schema);
});

var Token = (function (ctx) {
  if (!ctx.log) throw '!log';

  var schema = new mongoose.Schema({
    id: {
      type: String,
      trim: true
    },
    userID: {
      type: String,
      trim: true
    },
    forgotEmailToken: {
      type: String,
      trim: true
    }
  }, {
    collection: 'token',
    timestamps: true
  });

  return mongoose.model('Token', schema);
});

var Domain = (function (ctx) {
  if (!ctx.log) throw '!log';

  return mongoose.model('Domain', DomainSchema);
});

var Log = (function (ctx) {
  if (!ctx.log) throw '!log';

  return mongoose.model('Log', LogSchema);
});

var Channel = (function (ctx) {
  if (!ctx.log) throw '!log';

  return mongoose.model('Channel', ChannelSchema);
});

var Rate = (function (ctx) {
  if (!ctx.log) throw '!log';

  var schema = new mongoose.Schema({
    id: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    maxDomains: {
      type: Number
    },
    maxChannels: {
      type: Number
    }
  }, {
    collection: 'rate',
    timestamps: true
  });

  return mongoose.model('Rate', schema);
});

var _getModels = function () {
  return {
    Domain: Domain.apply(undefined, arguments),
    Log: Log.apply(undefined, arguments),
    Rate: Rate.apply(undefined, arguments),
    User: User.apply(undefined, arguments),
    Token: Token.apply(undefined, arguments),
    Channel: Channel.apply(undefined, arguments),
    scheme: {
      DomainSchema: DomainSchema,
      LogSchema: LogSchema
    }
  };
};

var Transporter = (function (ctx) {
  if (!ctx.log) throw '!log';

  var transporter = nodemailer.createTransport(smtpTransport(ctx.config.nodemailer));

  return transporter;
});

var _getUtils = function () {
  return {
    Transporter: Transporter.apply(undefined, arguments)
  };
};

var App = function () {
  function App() {
    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, App);

    _Object$assign(this, params);
    if (!this.log) this.log = this.getLogger();
    this.init();
  }

  _createClass(App, [{
    key: 'getLogger',
    value: function getLogger(params) {
      return bunyan.createLogger(_Object$assign({
        name: 'app',
        src: __DEV__,
        level: 'trace'
      }, params));
    }
  }, {
    key: 'getModels',
    value: function getModels() {
      return _getModels(this);
    }
  }, {
    key: 'getDatabase',
    value: function getDatabase() {
      var _this = this;

      return {
        run: function run() {
          new _Promise(function (resolve) {
            mongoose.connect(_this.config.db.url);
            resolve();
          });
        }
      };
    }
  }, {
    key: 'getUtils',
    value: function getUtils() {
      return _getUtils(this);
    }
  }, {
    key: 'init',
    value: function init() {
      this.log.trace('App init');
      this.db = this.getDatabase();

      this.utils = this.getUtils();
      this.log.trace('utils', _Object$keys(this.utils));

      this.models = this.getModels();
      this.log.trace('models', _Object$keys(this.models));
    }
  }, {
    key: 'startMonit',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
        var _this2 = this;

        var User, Log, users, i, _loop, j, mailOptions;

        return _regeneratorRuntime.wrap(function _callee$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                User = this.models.User;
                Log = this.models.Log;
                _context2.next = 4;
                return User.find({});

              case 4:
                users = _context2.sent;
                i = 0;

              case 6:
                if (!(i < users.length)) {
                  _context2.next = 17;
                  break;
                }

                _loop = /*#__PURE__*/_regeneratorRuntime.mark(function _loop(j) {
                  var _users$i$domains$j, url, channels, channelID, channel, res, status, statusText, flag, log, mailText, _res, _status, _statusText, _flag, _log, _status2, _statusText2, _flag2, _log2, transporter, endpoint;

                  return _regeneratorRuntime.wrap(function _loop$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          _users$i$domains$j = users[i].domains[j], url = _users$i$domains$j.url, channels = _users$i$domains$j.channels;
                          channelID = channels[0];
                          channel = users[i].channels.filter(function (element, index) {
                            return element.id === channelID;
                          })[0];
                          _context.prev = 3;
                          _context.next = 6;
                          return axios.get(url);

                        case 6:
                          res = _context.sent;
                          status = res.status, statusText = res.statusText;

                          console.log(url, res.status, res.statusText);
                          flag = res.status === 200 ? true : false;
                          log = new Log({ id: uniqid(), flag: flag, status: status, statusText: statusText, time: new Date().getTime() });

                          users[i].domains[j].logs.push(log);
                          users[i].save();
                          _context.next = 23;
                          break;

                        case 15:
                          _context.prev = 15;
                          _context.t0 = _context['catch'](3);
                          mailText = '';

                          if (_context.t0.response) {
                            _res = _context.t0.response;
                            _status = _res.status, _statusText = _res.statusText;

                            mailText = '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0430 \u0441\u0430\u0439\u0442 ' + url + ' \u0434\u0430\u043B \u043F\u043B\u043E\u0445\u043E\u0439 \u043E\u0442\u0432\u0435\u0442: ' + _status + ' ' + _statusText;
                            console.log(url, _res.status, _res.statusText);
                            _flag = false;
                            _log = new Log({ id: uniqid(), flag: _flag, status: _status, statusText: _statusText, time: new Date().getTime() });

                            users[i].domains[j].logs.push(_log);
                            users[i].save();
                          } else {
                            _status2 = 500;
                            _statusText2 = 'Server Error';

                            console.log(url, _status2, _statusText2);
                            mailText = '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0430 \u0441\u0430\u0439\u0442 ' + url + ' \u0434\u0430\u043B \u043F\u043B\u043E\u0445\u043E\u0439 \u043E\u0442\u0432\u0435\u0442: ' + _status2 + ' ' + _statusText2;
                            _flag2 = false;
                            _log2 = new Log({ id: uniqid(), flag: _flag2, status: _status2, statusText: _statusText2, time: new Date().getTime() });

                            users[i].domains[j].logs.push(_log2);
                            users[i].save();
                          }

                          transporter = _this2.utils.Transporter;
                          endpoint = channel.endpoint;
                          mailOptions = {
                            from: 'molodoyrustik@mail.ru',
                            to: endpoint,
                            subject: 'Уведомление с сайта Ashile.io',
                            text: mailText
                          };

                          transporter.sendMail(mailOptions);

                        case 23:
                        case 'end':
                          return _context.stop();
                      }
                    }
                  }, _loop, _this2, [[3, 15]]);
                });
                j = 0;

              case 9:
                if (!(j < users[i].domains.length)) {
                  _context2.next = 14;
                  break;
                }

                return _context2.delegateYield(_loop(j), 't0', 11);

              case 11:
                j++;
                _context2.next = 9;
                break;

              case 14:
                i++;
                _context2.next = 6;
                break;

              case 17:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee, this);
      }));

      function startMonit() {
        return _ref.apply(this, arguments);
      }

      return startMonit;
    }()
  }, {
    key: 'run',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
        var _this3 = this;

        return _regeneratorRuntime.wrap(function _callee2$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                this.log.trace('App run');
                _context3.prev = 1;
                _context3.next = 4;
                return this.db.run();

              case 4:
                _context3.next = 9;
                break;

              case 6:
                _context3.prev = 6;
                _context3.t0 = _context3['catch'](1);

                this.log.fatal(_context3.t0);

              case 9:
                return _context3.abrupt('return', new _Promise(function (resolve) {
                  setInterval(function () {
                    _this3.startMonit();
                  }, 60000);
                }));

              case 10:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee2, this, [[1, 6]]);
      }));

      function run() {
        return _ref2.apply(this, arguments);
      }

      return run;
    }()
  }]);

  return App;
}();

var app = new App({ config: config });
app.run();
//# sourceMappingURL=index.js.map
