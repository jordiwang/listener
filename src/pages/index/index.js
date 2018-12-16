const store = require('../../store/index');
const M = require('../../common/music');
const websocket = require('../../common/websocket');

Page(
    store.createPage({
        onLoad(options) {
            this.onMessage();
        },

        getUserInfo() {
            // 未授权先授权再登录创建房间
            if (!M.user.isLogin()) {
                store
                    .dispatch('getUserInfo')
                    .then(userInfo => {
                        return store.dispatch('login');
                    })
                    .then(() => {
                        this.createRoom();
                    })
                    .catch(err => {
                        console.error(err);
                        M.showToast('网络繁忙，请稍后重试');
                    });
            } else {
                this.createRoom();
            }
        },

        // 登录，创建/加入房间
        createRoom() {
            return store.dispatch('createRoom').catch(err => {
                console.error(err);
                M.showToast('网络繁忙，请稍后重试');
            });
        },

        onMessage() {
            websocket.onMessage(res => {
                if (res.ws_type) {
                    if (res.ws_type == 1 && res.result == 0) {
                        store.setGlobalData(
                            'roomInfo',
                            M.extend(store.app.globalData.roomInfo, {
                                room_id: res.room_id
                            })
                        );

                        wx.redirectTo({
                            url: '/pages/room/room'
                        });
                    }
                }
            });
        }
    })
);
