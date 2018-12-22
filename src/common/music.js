/*
 * @Author: jordiawang(王豪)
 * @Date: 2018-12-12 15:08:00
 *
 * 常用工具函数
 */

let app = null;

// 异步获取 app 对象
setTimeout(() => (app = getApp()));

const M = {
    // 拷贝对象
    extend(obj) {
        let isDeep = false,
            targetObj = obj,
            args = [].slice.call(arguments, 1);

        if (typeof obj == 'boolean') {
            isDeep = obj;
            targetObj = args.shift();
        }

        args.forEach(arg => {
            _extend(targetObj, arg, isDeep);
        });

        return targetObj;

        function _extend(target, source, deep) {
            for (let key in source) {
                let item = source[key];
                if ((deep && M.isPlainObject(item)) || M.isArray(item)) {
                    if (M.isPlainObject(item) && !M.isPlainObject(target[key])) {
                        target[key] = {};
                    }
                    if (M.isArray(source[key]) && !M.isArray(target[key])) {
                        target[key] = [];
                    }
                    _extend(target[key], source[key], deep);
                } else if (typeof item !== 'undefined') {
                    target[key] = item;
                }
            }
        }
    },

    /**
     * @method getPic
     * @desc 获取专辑,歌手图片
     * @param {string} type 图片类型: album或singer
     * @param {string} mid  字符串mid
     * @param {string} size  图片尺寸 默认:68  可选:68,90,150,300  注意: 部分尺寸图片可能不存在
     * @return 图片地址
     */
    getPic(type, mid, size) {
        let url = 'https://y.gtimg.cn/mediastyle/music_v11/extra/default_300x300.jpg?max_age=31536000';
        if (M.isString(mid) && mid.length >= 14) {
            //字符串mid 走photo_new新逻辑
            type = type == 'album' ? 'T002' : type == 'singer' ? 'T001' : type;
            url = 'https://y.gtimg.cn/music/photo_new/' + type + 'R' + (size || 68) + 'x' + (size || 68) + 'M000' + mid + '.jpg?max_age=2592000';
        }
        return url;
    },

    /**
     * 获取 appid
     *
     * @returns
     */
    getAppId() {
        return app.globalData.appid;
    },

    /**
     * 展示 toast
     *
     * @param {String} title
     */
    showToast(title) {
        wx.showToast({
            icon: 'none',
            title
        });
    },

    /**
     * 获取 url 参数
     *
     * @param {String} name
     * @param {String} url
     * @returns
     */
    getParam(name, url) {
        url = url.split('#')[0];
        let reg = new RegExp(`(\\?|&)${name}=(.*?)(#|$|&)`, 'i');
        let match = url.match(reg);
        return decodeURIComponent(match ? match[2] : '');
    },

    /**
     * 编码转义字符
     *
     * @param {String} str
     * @returns
     */
    decodeHTML(str) {
        // 解析字符串
        function fromCharCode(charCode) {
            if (charCode > 0xffff) {
                return String.fromCodePoint ? String.fromCodePoint(charCode) : fromDomText('&#' + charCode + ';');
            } else {
                return String.fromCharCode(charCode);
            }
        }

        return ('' + str)
            .replace(/&amp;/g, '&#38;')
            .replace(/&lt;/g, '&#60;')
            .replace(/&gt;/g, '&#62;')
            .replace(/&quot;/g, '&#34;')
            .replace(/&apos;/g, '&#39;')
            .replace(/&nbsp;/g, '&#160;')
            .replace(/&#(\d+);?/g, function(a, b) {
                return fromCharCode(b);
            })
            .replace(/&#x([0-9a-f]+);?/gi, function(a, b) {
                return fromCharCode(parseInt(b, 16));
            });
    },

    /**
     * 解码转义字符
     *
     * @param {String} str
     * @returns
     */
    encodeHTML(str) {
        let rtstr = '';
        for (let i = 0; i < str.length; i++) {
            if (/\W/.test(str[i]) && str.charCodeAt(i) < 256) {
                rtstr += '&#' + str.charCodeAt(i) + ';';
            } else {
                rtstr += str[i];
            }
        }
        return rtstr;
    },

    /**
     * 函数节流
     *
     * @param {Function} fn
     * @param {number} [time=300]
     * @returns
     */
    debounce(fn, time = 300) {
        let timeout = 0;
        return function() {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                fn();
            }, time);
        };
    },

    user: {
        getUin() {
            if (app.globalData.userInfo.music_uin) {
                return app.globalData.userInfo.music_uin || 0;
            } else {
                return 0;
            }
        },

        isLogin() {
            return this.getUin() > 0;
        },

        getOpenId() {
            return app.globalData.userInfo.openid;
        }
    }
};

['Object', 'Function', 'String', 'Number', 'Boolean', 'Date', 'Undefined', 'Null', 'Array', 'File'].forEach(name => {
    if (!M[`is${name}`]) {
        M[`is${name}`] = function(obj) {
            return Object.prototype.toString.call(obj) === '[object ' + name + ']';
        };
    }
});

M.isPlainObject = function(obj) {
    return M.isObject(obj) && obj != null && obj != obj.window && Object.getPrototypeOf(obj) == Object.prototype;
};

module.exports = M;
