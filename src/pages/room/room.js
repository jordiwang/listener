const store = require('../../store/index');
const M = require('../../common/music');
const player = require('../../common/player');
const websocket = require('../../common/websocket');

const touchData = {};

Page(
    store.createPage({
        data: {
            isWaiting: true,
            showList: false,
            currentSongInfo: {}, // 当前歌曲信息
            roomState: 'room' // 房间状态：room-等待 go-好友进入 load-生成歌单 music-播放歌曲
        },

        globalData: ['userInfo', 'songList', 'roomInfo'],

        onLoad(options) {
            if (options.roomid) {
                console.log(options.roomid);

                store.setGlobalData(
                    'roomInfo',
                    M.extend(store.app.globalData.roomInfo, {
                        room_id: parseInt(options.roomid)
                    })
                );
            }

            this.onMessage();

            player.on('ended', res => {
                let currentIndex = 0;
                let { songList } = this.data;
                for (let i = 0; i < songList.length; i++) {
                    if (songList[i].id == this.data.currentSongInfo.id) {
                        currentIndex = i;
                        break;
                    }
                }

                if (songList[currentIndex + 1]) {
                    this.playSong(songList[currentIndex + 1].id);
                }
            });
        },

        // 获取用户信息
        getUserInfo() {
            if (!M.user.isLogin()) {
                store
                    .dispatch('getUserInfo')
                    .then(userInfo => {
                        return store.dispatch('login');
                    })
                    .then(() => {
                        this.joinRoom();
                    })
                    .catch(err => {
                        console.error(err);
                        M.showToast('网络繁忙，请稍后重试');
                    });
            } else {
                this.joinRoom();
            }
        },

        // 加入房间
        joinRoom() {
            return store.dispatch('joinRoom').catch(err => {
                console.error(err);
                M.showToast('网络繁忙，请稍后重试');
            });
        },

        /**
         * 播放列表中的歌曲
         *
         * @param {*} evt
         */
        playListSong(evt) {
            const { id } = evt.currentTarget.dataset;
            this.playSong(id);
        },

        /**
         * 播放指定歌曲
         *
         * @param {number} songid
         * @param {boolean} notReport
         */
        playSong(songid, notReport) {
            player.play(songid);
            player.getSongInfo(songid).then(songMap => {
                let currentSongInfo = null;

                currentSongInfo = songMap[songid];

                currentSongInfo.singername = currentSongInfo.singer
                    .map(singer => {
                        return singer.name;
                    })
                    .join('/');

                this.setData({
                    currentSongInfo
                });

                if (!notReport) {
                    store.dispatch('changeSong', currentSongInfo.id);
                    store.dispatch('reportTime');
                }
            });
        },

        // 切歌
        songTouchStart(evt) {
            touchData.startX = evt.touches[0].pageX;
            touchData.startY = evt.touches[0].pageY;
        },

        songTouchEnd(evt) {
            let deltaY = evt.changedTouches[0].pageY - touchData.startY;
            let currentIndex = 0;
            let { songList } = this.data;
            for (let i = 0; i < songList.length; i++) {
                if (songList[i].id == this.data.currentSongInfo.id) {
                    currentIndex = i;
                    break;
                }
            }

            if (Math.abs(deltaY) > 30) {
                if (deltaY < 0 && songList[currentIndex + 1]) {
                    this.playSong(songList[currentIndex + 1].id);
                } else if (deltaY > 0 && songList[currentIndex - 1]) {
                    this.playSong(songList[currentIndex - 1].id);
                }
            }
        },

        // 收藏
        favSong() {
            store.dispatch('operateSong', {
                ws_type: 9,
                song_id: this.data.currentSongInfo.id,
                song_type: this.data.currentSongInfo.type
            });
        },

        // 跳转到搜索
        addSong() {
            wx.navigateTo({
                url: '/pages/search/search'
            });
        },

        // 展示/隐藏列表
        toggleList(evt) {
            this.setData({
                showList: evt.currentTarget.dataset.show
            });
        },

        // 跳转到设置
        setting() {
            wx.navigateTo({
                url: '/pages/setting/setting'
            });
        },

        // 收消息
        onMessage() {
            websocket.onMessage(res => {
                if (res.ws_type) {
                    switch (res.ws_type) {
                        // 加入房间
                        case 2:
                            if (res.room_info) {
                                store.setGlobalData('roomInfo', M.extend(store.app.globalData.roomInfo, res.room_info));

                                this.setData({
                                    roomState: 'load'
                                });
                            }
                            break;

                        // 换歌
                        case 6:
                            this.playSong(res.song_id, true);
                            break;

                        // 收藏
                        case 9:
                            this.data.currentSongInfo.isFav = 1;
                            this.setData({
                                currentSongInfo: this.data.currentSongInfo
                            });
                            break;

                        // 生成歌单完成
                        case 12:
                            this.setData({
                                roomState: 'music'
                            });

                            player.getSongInfo(res.songs, { needUrl: 1 }).then(songMap => {
                                let songList = [];
                                res.songs.forEach(songid => {
                                    songMap[songid] && songList.push(songMap[songid]);
                                });

                                store.setGlobalData('songList', songList);

                                this.playSong(songList[0].id,true);
                            });
                            break;
                        default:
                            break;
                    }
                }
            });
        },

        /**
         * 分享事件
         *
         * @returns
         */
        onShareAppMessage(res) {
            return {
                title: '一起来听歌~',
                path: `/pages/room/room?roomid=${store.app.globalData.roomInfo.room_id}`
            };
        }
    })
);
