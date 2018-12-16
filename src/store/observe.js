/*
 * @Author: jordiawang(王豪)
 * @Date: 2018-12-12 15:07:33
 *
 * 发布/订阅
 */

class Observer {
    constructor() {
        this.events = {};
    }

    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    emit(eventName, param) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(item => {
                item(param);
            });
        }
    }

    clear(eventName) {
        this.events[eventName] = [];
    }

    off(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        for (let i = 0; i < this.events[eventName].length; i++) {
            if (this.events[eventName][i] === callback) {
                this.events[eventName].splice(i, 1);
                return;
            }
        }
    }

    one(eventName, callback) {
        this.events[eventName] = [callback];
    }
}

const observer = new Observer();

module.exports = { observer, Observer };
