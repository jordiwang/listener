const store = require('./store/index');

App(
    store.createApp({
        globalData: {
            userInfo: {},
            songList: [],
            appid: 'wx0c329c5721be06db'
        }
    })
);
