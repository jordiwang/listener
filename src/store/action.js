/*
 * @Author: jordiawang(王豪)
 * @Date: 2018-12-12 15:05:10
 *
 * 修改 globalData 的操作或者异步的操作都放在这里，页面通过 store.dispatch('actionName', params) 执行
 */

const ajax = require('../common/ajax');
const M = require('../common/music');

const action = {
    /**
     * 获取用户授权拉取用户信息
     *
     * @returns
     */
    getUserInfo() {
        return new Promise((resolve, reject) => {
            let authData = {
                appid: M.getAppId()
            };

            let _getMusicUserInfo = () => {
                const { code, encryptData, signature, rawData, iv } = authData;

                // 获取到必要信息，发送请求获取 openid music_key music_uin
                if (code && encryptData && signature && rawData && iv) {
                    ajax({
                        url: 'https://c.y.qq.com/base/fcgi-bin/mina_wx_login.fcg',
                        data: authData
                    })
                        .then(res => {
                            if (res.data && res.data.code == 0) {
                                this.setGlobal('userInfo', M.extend(this.app.globalData.userInfo, res.data));

                                resolve(this.app.globalData.userInfo);
                            } else {
                                reject(res);
                            }
                        })
                        .catch(err => {
                            reject(err);
                        });
                }
            };

            wx.getUserInfo({
                // 使用箭头函数保证 this 指向
                success: res => {
                    this.setGlobal('userInfo', M.extend(this.app.globalData.userInfo, res.userInfo));

                    authData.encryptData = res.encryptedData;
                    authData.signature = res.signature;
                    authData.rawData = res.rawData;
                    authData.iv = res.iv;

                    // 调 cgi 获取 uin 等信息
                    _getMusicUserInfo();
                },
                fail(err) {
                    reject(err);
                }
            });

            wx.login({
                success: res => {
                    this.setGlobal('userInfo', M.extend(this.app.globalData.userInfo, { code: res.code }));

                    authData.code = res.code;

                    // 调 cgi 获取 uin 等信息
                    _getMusicUserInfo();
                }
            });
        });
    }
};

module.exports = action;
