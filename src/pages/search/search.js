const store = require('../../store/index');
const websocket = require('../../common/websocket');
const player = require('../../common/player');

Page(
    store.createPage({
        globalData: ['mixList'],

        onLoad() {
            this.onMessage();
        },

        addList(evt) {
            let { id } = evt.currentTarget.dataset;

            store.dispatch('operateSong', {
                ws_type: 7,
                playlist_id: parseInt(id)
            });
        },

        onMessage() {
            websocket.onMessage(res => {
                if (res.ws_type && res.ws_type == 7) {
                    player.getSongInfo(res.songs).then(songMap => {
                        let songList = [];

                        res.songs.forEach(songid => {
                            songMap[songid] && songList.push(songMap[songid]);
                        });

                        store.setGlobalData('songList', store.app.globalData.songList.concat(songList));

                        wx.navigateBack({
                            delta: 1
                        });
                    });
                }
            });
        }
    })
);
