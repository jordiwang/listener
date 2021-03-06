/*
 * @Author: jordiawang(王豪)
 * @Date: 2018-12-12 15:08:52
 *
 * ajax封装，上报、错误重试等在这里做
 */

const M = require('./music');

const noop = function() {};

const defaultUrl = 'https://www.ctchen.cn/api';

function ajax(option = {}) {
    return new Promise(function(resolve, reject) {
        option = M.extend({ method: 'POST', url: defaultUrl }, option);

        let successCallback = option.success || noop;
        let failCallback = option.fail || noop;

        console.log(option);

        option.success = function(res) {
            console.log(res);

            successCallback(res);
            if ((res.statusCode >= 200 && res.statusCode <= 300) || res.statusCode == 304) {
                resolve(res);
            } else {
                reject(res);
            }
        };

        option.fail = function(err) {
            failCallback(err);
            reject(err);
        };

        wx.request(option);
    });
}

module.exports = ajax;
