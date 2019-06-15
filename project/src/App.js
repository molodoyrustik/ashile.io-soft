import bunyan from 'bunyan';
import mongoose from 'mongoose';
import axios from 'axios';
import uniqid from 'uniqid';

import getModels from './models/index';
import getUtils from './utils/index';


export default class App {
  constructor(params = {}) {
    Object.assign(this, params);
    if (!this.log) this.log = this.getLogger();
    this.init();
  }

  getLogger(params) {
    return bunyan.createLogger(Object.assign({
      name: 'app',
      src: __DEV__,
      level: 'trace',
    }, params))
  }

  getModels() {
    return getModels(this);
  }

  getDatabase() {
    return {
      run: () => {
        new Promise((resolve) => {
          mongoose.connect(this.config.db.url);
          resolve();
        });
      }
    }
  }

  getUtils() {
    return getUtils(this);
  }

  init() {
    this.log.trace('App init');
    this.db = this.getDatabase();

    this.utils = this.getUtils();
    this.log.trace('utils', Object.keys(this.utils));

    this.models = this.getModels();
    this.log.trace('models', Object.keys(this.models));
  }

  async startMonit() {
    const User = this.models.User;
    const Log = this.models.Log;
    const users = await User.find({});
    for (let i = 0; i < users.length; i++) {
     for(let j = 0; j < users[i].domains.length; j++) {
        const { url, channels } = users[i].domains[j]
        const channelID = channels[0];
        const channel = users[i].channels.filter((element, index) => {
          return element.id === channelID;
        })[0];
        try {
          const res = await axios.get(url);
          const { status, statusText } = res;
          console.log(url, res.status, res.statusText);
          const flag = res.status === 200 ? true : false;
          const log = new Log({ id: uniqid(), flag, status, statusText, time: (new Date()).getTime() })
          users[i].domains[j].logs.push(log)
          users[i].save();
        } catch (err) {
          let mailText = ``;
          if(err.response) {
            const res = err.response;
            const { status, statusText } = res;
            mailText = `Запрос на сайт ${url} дал плохой ответ: ${status} ${statusText}`;
            console.log(url, res.status, res.statusText);
            const flag = false;
            const log = new Log({ id: uniqid(), flag, status, statusText, time: (new Date()).getTime() })
            users[i].domains[j].logs.push(log)
            users[i].save();
          } else {
            const status = 500;
            const statusText = 'Server Error';
            console.log(url, status, statusText);
            mailText = `Запрос на сайт ${url} дал плохой ответ: ${status} ${statusText}`;
            const flag = false;
            const log = new Log({ id: uniqid(), flag, status, statusText, time: (new Date()).getTime() })
            users[i].domains[j].logs.push(log)
            users[i].save();
          }

          const transporter = this.utils.Transporter;
          const { endpoint } = channel;
          var mailOptions = {
            from: 'molodoyrustik@mail.ru',
            to: endpoint,
            subject: 'Уведомление с сайта Ashile.io',
            text: mailText
          };
          transporter.sendMail(mailOptions);
        }
     }
    }
  }

  async run() {
    this.log.trace('App run');
    try {
      await this.db.run();
    } catch (err) {
      this.log.fatal(err);
    }
    return new Promise((resolve) => {
      setInterval(() => {
        this.startMonit();
      }, 60000)
    });
  }
}
