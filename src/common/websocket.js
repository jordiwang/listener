const M = require('./music');

const noop = function() {};

const defaultUrl = 'wss://www.ctchen.cn/ws';

const messageCallbackList = [];

let isConnect = false;
let isOnMessage = false;

// 建立连接
function connect(option = {}) {
    return new Promise(function(resolve, reject) {
        option = M.extend(
            {
                url: defaultUrl,
                success(res) {},
                fail(err) {
                    reject(err);
                }
            },
            option
        );

        wx.connectSocket(option);

        wx.onSocketOpen(res => {
            isConnect = true;
            resolve(res);
        });
    });
}

function send(data = {}) {
    return new Promise(function(resolve, reject) {
        console.log(data);

        if (typeof data != 'string') {
            try {
                data = JSON.stringify(data);
            } catch (error) {}
        }

        let _sendMessage = () => {
            wx.sendSocketMessage({
                data,
                success(res) {
                    resolve(res);
                },
                fail(err) {
                    reject(err);
                }
            });
        };

        if (!isConnect) {
            connect().then(_sendMessage);
        } else {
            _sendMessage();
        }
    });
}

function onMessage(callback = noop) {
    messageCallbackList.push(callback);

    if (!isOnMessage) {
        wx.onSocketMessage(res => {
            res = JSON.parse(res.data);

            console.log(res);

            messageCallbackList.forEach(fn => {
                fn(res);
            });
        });
    }
}

module.exports = {
    onMessage,
    connect,
    send
};
