/*
 * @Author: jordiawang(王豪)
 * @Date: 2018-12-13 19:33:21
 *
 * 歌曲播放
 *
 * 2018-12-14 16:40:04  基础功能完成，自动队列、播放受阻，选择播放源，cdn竞速待实现
 */

const ajax = require('./ajax.js');
const M = require('./music');

// 检查是否是 mid
const regMid = /^\w{14}$/;

// 保存查询到的歌曲信息
const songMap = {};

// 查询到的cdn信息
let cdnInfo = {
    isInited: false,
    sip: ['http://dl.stream.qqmusic.qq.com/']
};

// guid
let guid = '';

// 工具函数
const utils = {
    /**
     * 生成 guid
     *
     */
    getGUID() {
        if (guid) {
            return guid;
        } else {
            guid = new Date().getUTCMilliseconds();
            guid = '' + ((Math.round(Math.random() * 2147483647) * guid) % 10000000000);
            return guid;
        }
    },

    /**
     * 歌曲对象是否能够播放
     *
     * @param {Object} song
     * @returns
     */
    canPlay(song) {
        if (song) {
            if (song.url || song.playFile) {
                return true; // 有播放链接
            } else if (song.action) {
                if (song.action.play) {
                    return true; // 有播放权限
                } else if (opts && opts.tryPlay && song.action.try) {
                    return true; // 支持试听且有试听权限
                }
            }
        }
        return false;
    },

    /**
     * 格式化传入参数
     *
     * @param {String|Array} songs
     * @returns
     */
    serializeSongData(songs) {
        if (!songs) {
            songs = [];
        } else if (M.isString(songs) && /^[\w,]+$/.test(songs)) {
            // id或mid字符串列表
            songs = songs.split(',');
        } else if (!M.isArray(songs)) {
            songs = [songs];
        }

        return songs.map(song => {
            if (song) {
                if (regMid.test(song)) {
                    // mid
                    song = {
                        mid: song
                    };
                } else if (song > 0) {
                    // id
                    song = {
                        id: song
                    };
                } else {
                    song = null;
                }

                if (song) {
                    if (song.id) {
                        song.id = parseInt(song.id);
                    }

                    if (song.id || song.mid) {
                        song.type = song.type > 0 ? parseInt(song.type) : 0;
                    }
                }
            }

            return song;
        });
    },

    /**
     * 是否是正常歌曲
     *
     * @param {Object} song
     * @returns
     */
    isNormalSong(song) {
        return !!(song && (regMid.test(song.mid) || song.id > 0));
    },

    /**
     * 解析歌曲 switch
     *
     * @param {Number} songSwitch
     */
    parseSwitch(songSwitch) {
        songSwitch = songSwitch > 0 ? parseInt(songSwitch) : 0;
        let action = { switch: songSwitch };
        let actionKeys = [
            '', // 第一位置空
            'play_lq', // 01 普通音质播放权限位 （0：不可以播放 1：可以播放）
            'play_hq', // 02 HQ音质播放权限位 （0：不可以播放 1：可以播放）
            'play_sq', // 03 SQ音质播放权限位 （0：不可以播放 1：可以播放）
            'down_lq', // 04 普通音质下载权限位 （0：不可以下载 1：可以下载）
            'down_hq', // 05 HQ音质下载权限位 （0：不可以下载 1：可以下载）
            'down_sq', // 06 SQ音质下载权限位 （0：不可以下载 1：可以下载）
            'soso', // 07 地球展示权限位 （0：库内不展示地球 1：展示地球标志）
            'fav', // 08 收藏权限位 （0：无权限 1：有权限）
            'share', // 09 分享权限位 （0：无权限 1：有权限）
            'bgm', // 10 背景音乐权限位 （0：无权限 1：有权限）
            'ring', // 11 铃声设置权限位 （0：无权限 1：有权限）
            'sing', // 12 唱这首歌权限位 （0：无权限 1：有权限）
            'radio', // 13 单曲电台权限位 （0：无权限 1：有权限）
            'try', // 14 试听权限位 （0：不可以试听 1：可以试听）
            'give', // 15 赠送权限位 （0：不可以赠送 1：可以赠送）
            'poster', // 16 歌词海报 （0：无权限 1：有权限）
            '', // 17 播放DTS （web不支持）
            '', // 18 下载DTS （web不支持）
            'bullet' // 19 弹幕 （0：无权限 1：有权限）
        ];

        actionKeys.forEach((key, index) => {
            if (key) {
                action[key] = !!(songSwitch & (1 << index));
            }
        });

        action.play = action.play_lq || action.play_hq || action.play_sq;
        action.down = action.down_lq || action.down_hq || action.down_sq;
        return action;
    }
};

class Player {
    constructor() {
        // 当前播放状态
        this.state = {
            index: 0, // 当前播放位置
            song: null, // 当前播放歌曲
            playState: 'stop', // 当前播放状态
            songList: [] // 当前播放列表
        };
        this.audio = null; // 音频对象
        this.eventMap = {}; // 事件回调保存
    }

    // 当前音频长度
    get duration() {
        return this.audio.duration;
    }

    set duration(value) {
        throw new Error('invalid value (只读属性，不支持设值)');
    }

    // 当前音频播放位置
    get currentTime() {
        return this.audio.currentTime;
    }

    set currentTime(value) {
        throw new Error('invalid value (只读属性，不支持设值)');
    }

    // 当前音频已缓冲的时间
    get buffered() {
        return this.audio.buffered;
    }

    set buffered(value) {
        throw new Error('invalid value (只读属性，不支持设值)');
    }

    /**
     * 创建音频对象, 播放指定歌曲
     *
     * @param {Object} song
     */
    _audioPlay(song) {
        if (!this.audio) {
            this.audio = wx.getBackgroundAudioManager();

            // 监听相关事件
            this._bindEvent();
        }

        let singerName = song.singer
            .map(singer => {
                return singer.name;
            })
            .join('/');

        this.audio.src = song.url;
        this.audio.title = song.name;
        this.audio.coverImgUrl = M.getPic('album', song.album.mid);
        this.audio.webUrl = `https://i.y.qq.com/v8/playsong.html?ADTAG=miniapp&songmid=${song.mid}`;
        this.audio.singer = singerName;

        // 设置播放歌曲
        this.state.song = song;
    }

    /**
     * 监听音频对象相关事件
     *
     * @memberof Player
     */
    _bindEvent() {
        const { audio } = this;

        audio.onCanplay(() => {
            this.state.playState = 'canplay';
            this._trigger('canplay');
        });

        audio.onEnded(() => {
            this.state.playState = 'ended';
            this._trigger('ended');
        });

        audio.onError(() => {
            this.state.playState = 'error';
            this._trigger('error');
        });

        audio.onPlay(() => {
            this.state.playState = 'play';
            this._trigger('play');
        });

        audio.onPause(() => {
            this.state.playState = 'pause';
            this._trigger('pause');
        });

        audio.onStop(() => {
            this.state.playState = 'stop';
            this._trigger('stop');
        });

        audio.onTimeUpdate(() => {
            this._trigger('timeupdate');
        });

        audio.onWaiting(() => {
            this.state.playState = 'waiting';
            this._trigger('waiting');
        });
    }

    /**
     * 触发事件
     *
     * @param {String} eventName
     * @memberof Player
     */
    _trigger(eventName) {
        if (this.eventMap[eventName]) {
            this.eventMap[eventName].forEach(handler => {
                handler(this);
            });
        }
    }

    /**
     * 查询歌曲信息，目前只支持是否查 url
     *
     * @param {String|Array} songs 要查询的歌曲列表
     * @param {Object} opt  查询参数
     * @param {boolean} opt.needUrl 是否查询播放链接
     * @param {boolean} opt.force 是否使用已查询到的缓存
     * @returns {Promise}   返回 promise，传入 songMap
     * @memberof Player
     */
    getSongInfo(songs, opt = {}) {
        return new Promise(function(resolve, reject) {
            // 通过id查询歌曲信息
            let paramId = {
                ids: [],
                types: []
            };

            // 通过mid查询歌曲信息
            let paramMid = {
                mids: [],
                types: []
            };

            // 通过mid查询歌曲链接
            let paramUrl = {
                mids: [],
                types: []
            };

            /**
             * 歌曲信息查询参数
             *
             * @param {Object} param
             * @returns
             */
            let getSongCgiParams = param => {
                return {
                    module: 'track_info.UniformRuleCtrlServer',
                    method: 'GetTrackInfo',
                    param: param
                };
            };

            /**
             * cdn信息查询参数
             *
             * @returns
             */
            let getCDNCgiParams = () => {
                return {
                    module: 'CDN.SrfCdnDispatchServer',
                    method: 'GetCdnDispatch',
                    param: {}
                };
            };

            /**
             * 歌曲链接查询参数
             *
             * @param {Object} param
             * @returns
             */
            let getUrlCgiParams = param => {
                return {
                    module: 'vkey.GetVkeyServer',
                    method: 'CgiGetVkey',
                    param: {
                        guid: utils.getGUID(),
                        songmid: param.mids,
                        songtype: param.types,
                        filename: '', // 试听播放时使用
                        uin: '' + M.user.getUin(),
                        loginflag: M.user.isLogin() ? 1 : 0,
                        platform: '25', // 小程序
                        h5to: 'speed' // 使用 speed 统一下发 sip
                    }
                };
            };

            /**
             * 格式化查询到的歌曲信息列表
             *
             * @param {Array} list
             * @returns
             */
            let parseSongList = list => {
                if (M.isArray(list) && list.length) {
                    list.forEach(song => {
                        if (song) {
                            // 删除原始歌曲链接等
                            delete song.url;
                            delete song.playFile;
                            delete song.tryUrl;
                            delete song.tryFile;

                            // 解析 action
                            if (song.action) {
                                M.extend(song.action, utils.parseSwitch(song.action.switch));
                            }

                            songMap[song.id] = songMap[song.mid] = song;
                        }
                    });

                    return list;
                } else {
                    return [];
                }
            };

            /**
             * 格式化查询的歌曲链接
             *
             * @param {Array} list
             */
            let parseUrlList = list => {
                if (M.isArray(list) && list.length) {
                    list.forEach(item => {
                        let song = songMap[item.songmid];
                        if (utils.canPlay(song)) {
                            let url = item.purl;
                            if (url) {
                                song.url = cdnInfo.sip[0] + url;
                            }
                        }
                    });
                }
            };

            songs = utils.serializeSongData(songs);

            songs.forEach(item => {
                if (utils.isNormalSong(item)) {
                    let { id, mid, type } = item;

                    let song = opt.force ? null : songMap[id] || songMap[mid];

                    // 无缓存数据
                    if (!song) {
                        type = type > 0 ? parseInt(type) : 0;

                        if (mid) {
                            // mid
                            paramMid.mids.push(mid);
                            paramMid.types.push(type);

                            if (opt.needUrl) {
                                paramUrl.mids.push(mid);
                                paramUrl.types.push(type);
                            }
                        } else {
                            // id
                            paramId.ids.push(id);
                            paramId.types.push(type);
                        }
                    } else if (opt.needUrl && !song.url) {
                        // 缓存数据中无播放链接
                        paramUrl.mids.push(song.mid);
                        paramUrl.types.push(song.type);
                    }
                }
            });

            if (paramMid.mids.length || paramId.ids.length || paramUrl.mids.length) {
                let reqData = {};

                // mid查询
                if (paramMid.mids.length) {
                    reqData.midReq = getSongCgiParams(paramMid);
                }

                // id查询
                if (paramId.ids.length) {
                    reqData.idReq = getSongCgiParams(paramId);
                }

                // 歌曲链接
                if (paramUrl.mids.length) {
                    reqData.urlReq = getUrlCgiParams(paramUrl);
                }

                // 查询 cdn 信息
                if (!cdnInfo.isInited) {
                    reqData.cdnReq = getCDNCgiParams();
                }

                ajax({
                    url: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
                    data: reqData
                })
                    .then(res => {
                        let idSongList = []; // 根据id查询的歌曲信息列表
                        if (res && res.data) {
                            const { midReq, idReq, urlReq, cdnReq } = res.data;

                            // id 查询的歌曲信息
                            if (idReq && idReq.data && idReq.data.tracks) {
                                idSongList = parseSongList(idReq.data.tracks);
                            }

                            // mid 查询的歌曲信息
                            if (midReq && midReq.data && midReq.data.tracks) {
                                parseSongList(midReq.data.tracks);
                            }

                            // 保存查询到的cdn信息
                            if (cdnReq) {
                                cdnInfo = M.extend(cdnInfo, cdnReq.data || {});
                                cdnInfo.isInited = true;
                            }

                            // 格式化 url
                            if (urlReq && urlReq.data && urlReq.data.midurlinfo) {
                                parseUrlList(urlReq.data.midurlinfo);
                            }
                        }
                        return idSongList;
                    })
                    .then(idSongList => {
                        // 需要再跟据 id 查到的歌曲信息查一次歌曲链接
                        if (opt.needUrl && idSongList.length) {
                            let idReqData = {};

                            let idParamUrl = {
                                mids: [],
                                types: []
                            };

                            idSongList.forEach(song => {
                                idParamUrl.mids.push(song.mid);
                                idParamUrl.types.push(song.type);
                            });

                            idReqData.urlReq = getUrlCgiParams(idParamUrl);

                            return ajax({
                                url: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
                                data: idReqData
                            });
                        } else {
                            // 不查歌曲链接直接 resolve
                            resolve(songMap);
                        }
                    })
                    .then(res => {
                        if (res && res.data) {
                            const { urlReq } = res.data;

                            // 格式化 url
                            if (urlReq && urlReq.data && urlReq.data.midurlinfo) {
                                parseUrlList(urlReq.data.midurlinfo);
                            }

                            resolve(songMap);
                        } else {
                            reject(res);
                        }
                    });
            } else {
                resolve(songMap);
            }
        });
    }

    /**
     * 歌曲播放
     *
     * @param {String|Array} songs 要播放的歌曲列表
     * @param {Object} opt 播放配置
     * @memberof Player
     */
    play(songs, opt) {
        let songList = utils.serializeSongData(songs);
        this.state.songList = songList;

        this.getSongInfo(songs, { needUrl: 1 }).then(map => {
            let index = this.state.index;
            let song = map[songList[index].mid || songList[index].id];

            if (utils.canPlay(song)) {
                this._audioPlay(song);
            } else {
                // 播放受阻逻辑
            }
        });

        return this;
    }

    /**
     * 暂停播放
     *
     * @memberof Player
     */
    pause() {
        if (audio) {
            audio.pause();
        }
    }

    /**
     * 监听事件
     *
     * @param {String} eventName
     * @param {Function} callback
     * @memberof Player
     */
    on(eventName, callback) {
        if (!this.eventMap[eventName]) {
            this.eventMap[eventName] = [];
        }

        this.eventMap[eventName].push(callback);
    }
}

module.exports = new Player();
