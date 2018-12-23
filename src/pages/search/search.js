const store = require('../../store/index');
const websocket = require('../../common/websocket');
const player = require('../../common/player');

let inputTimeout = 0;

Page(
    store.createPage({
        data: {
            searchList: []
        },
        globalData: ['mixList'],

        onLoad() {
            this.onMessage();
        },

        /**
         * 添加歌单
         *
         * @param {*} evt
         */
        addList(evt) {
            let { id } = evt.currentTarget.dataset;

            store.dispatch('operateSong', {
                ws_type: 7,
                playlist_id: parseInt(id)
            });
        },

        /**
         *  搜索内容
         *
         * @param {*} evt
         */
        inputSearch(evt) {
            clearTimeout(inputTimeout);
            inputTimeout = setTimeout(() => {
                this.search(evt.detail.value.trim());
            }, 500);
        },

        /**
         * 搜索展示
         *
         * @param {*} word
         */
        search(word) {
            store.dispatch('serach', { word }).then(res => {
                if (res && res.data && res.data.data) {
                    res.data.data.song.list.forEach(song => {
                        song.singername = song.singer
                            .map(singer => {
                                return singer.name;
                            })
                            .join('/');
                    });

                    this.setData({
                        searchList: res.data.data.song.list
                    });

                    console.log(this.data.searchList);
                }
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
