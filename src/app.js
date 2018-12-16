const store = require('./store/index');

App(
    store.createApp({
        globalData: {
            userInfo: {},
            roomInfo: {},
            songList: [],
            mixList: [], // 歌单列表
            appid: 'wx0c329c5721be06db'
        },

        onLaunch() {
            store.dispatch('getMixList');
            wx.getSetting({
                success(res) {
                    if (res.authSetting['scope.userInfo']) {
                        store.dispatch('getUserInfo').then(userInfo => {
                            return store.dispatch('login');
                        });
                    }
                }
            });
        }
    })
);
