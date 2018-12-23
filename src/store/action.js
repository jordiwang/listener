/*
 * @Author: jordiawang(王豪)
 * @Date: 2018-12-12 15:05:10
 *
 * 修改 globalData 的操作或者异步的操作都放在这里，页面通过 store.dispatch('actionName', params) 执行
 */

const ajax = require('../common/ajax');
const websocket = require('../common/websocket');
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
                                this.setGlobalData('userInfo', M.extend(this.app.globalData.userInfo, res.data));

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

            wx.login({
                success: loginRes => {
                    this.setGlobalData('userInfo', M.extend(this.app.globalData.userInfo, { code: loginRes.code }));

                    authData.code = loginRes.code;

                    wx.getUserInfo({
                        // 使用箭头函数保证 this 指向
                        success: res => {
                            this.setGlobalData('userInfo', M.extend(this.app.globalData.userInfo, res.userInfo));

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
                }
            });
        });
    },

    /**
     * 登录小程序
     *
     * @returns
     */
    login() {
        return ajax({
            data: {
                api_type: 1,
                uin: M.user.getUin()
            }
        });
    },

    /**
     * 创建房间
     *
     * @returns
     */
    createRoom() {
        return websocket.send({
            uin: M.user.getUin(),
            ws_type: 1,
            room_cover: ''
        });
    },

    /**
     * 加入房间
     *
     * @returns
     */
    joinRoom() {
        return websocket.send({
            uin: M.user.getUin(),
            ws_type: 2,
            room_id: this.app.globalData.roomInfo.room_id
        });
    },

    /**
     * 离开房间
     *
     * @returns
     */
    exitRoom() {
        return websocket.send({
            uin: M.user.getUin(),
            ws_type: 3,
            room_id: this.app.globalData.roomInfo.room_id
        });
    },

    /**
     * 销毁房间
     *
     * @returns
     */
    removeRoom() {
        return websocket.send({
            uin: M.user.getUin(),
            ws_type: 4,
            room_id: this.app.globalData.roomInfo.room_id
        });
    },

    /**
     * 更换歌曲
     *
     * @param {Number} songid
     * @returns
     */
    changeSong(songid) {
        return websocket.send({
            uin: M.user.getUin(),
            ws_type: 6,
            song_id: parseInt(songid)
        });
    },

    /**
     * 操作歌曲
     *
     * {
     *  ws_type: 7,     // 类型 7 添加 8 删除 9 收藏
     *  song_id: 0,     // 歌曲 id
     *  song_type: 0,   // 歌曲类型
     *  playlist_id: 0  // 要添加的歌单 id
     * }
     *
     * @param {Object} data
     * @returns
     */
    operateSong(data) {
        return websocket.send(
            M.extend(
                {
                    uin: M.user.getUin()
                },
                data
            )
        );
    },

    /**
     * 上报播放时长，进度
     *
     */
    reportTime() {
        // return
    },

    /**
     * 热门歌单
     *
     */
    getMixList() {
        return ajax({
            url: 'https://c.y.qq.com/musichall/fcgi-bin/fcg_yqqhomepagerecommend.fcg'
        }).then(res => {
            console.log(res);

            if (res.data && res.data.data) {
                this.setGlobalData('mixList', res.data.data.songList || []);
            }
        });
    },

    /**
     * 搜索歌曲
     *
     * @param {String} word
     * @returns
     */
    serach({ word }) {
        return ajax({
            url: 'https://elsonzhang.cn/search',
            method: 'GET',
            data: {
                format: 'json',
                w: word,
                zhidaqu: 1,
                catZhida: 1,
                sem: 1,
                aggr: 1,
                perpage: 20,
                n: 20,
                p: 1
            }
        });
    }
};

module.exports = action;
