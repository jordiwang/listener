/*
 * @Author: jordiawang(王豪)
 * @Date: 2018-12-16 12:29:27
 *
 * 解析歌词数据
 */
const M = require('./music');

function playTime2ms(playTime) {
    var _minutes = parseInt(playTime.substring(0, playTime.indexOf(':')), 10) * 60 * 1000,
        _seconds = parseInt(playTime.substring(playTime.indexOf(':') + 1, playTime.indexOf('.')), 10) * 1000,
        _mSecond = parseInt(playTime.substring(playTime.indexOf('.') + 1), 10);

    return _minutes + _seconds + _mSecond;
}

function ms2playTime(ms) {
    var _minutes = parseInt(ms / 60000, 10),
        _seconds = parseInt((ms / 1000) % 60, 10),
        _mSecond = ms - _minutes * 60000 - _seconds * 1000;
    return (_minutes > 9 ? '' : '0') + _minutes + ':' + (_seconds > 9 ? '' : '0') + _seconds + '.' + (_mSecond > 9 ? '' : '0') + _mSecond;
}

function parseLyric(originLyricStr = '') {
    originLyricStr = M.decodeHTML(originLyricStr);

    let lrcList = [],
        tmpList = originLyricStr.split('\n');

    let lrcData = {};

    tmpList.forEach(item => {
        let preTime = '',
            _rIndex = item.lastIndexOf(']'),
            _lSubstr = item.substring(0, _rIndex + 1), //时间标签子串
            _rSubstr = item.substring(_rIndex + 1), //歌词内容子串
            _tmpTimes = _lSubstr.replace(new RegExp('\\[', 'g'), '').split(']'), //分割时间标签
            _tLen = _tmpTimes.length,
            j = _tLen - 1,
            _tmpTag = '',
            _pointPos = 0;

        if (j > 0) {
            while (j--) {
                _tmpTag = _tmpTimes[j];

                if (_tmpTag.indexOf('al:') > 0) {
                    // album

                    _pointPos = _tmpTag.indexOf(':');
                    lrcData.album = _tmpTag.substring(_pointPos + 1);
                } else if (_tmpTag.indexOf('ar:') != -1) {
                    // artist

                    _pointPos = _tmpTag.indexOf(':');
                    lrcData.artist = _tmpTag.substring(_pointPos + 1);
                } else if (_tmpTag.indexOf('ti:') != -1) {
                    // title

                    _pointPos = _tmpTag.indexOf(':');
                    lrcData.songTitle = _tmpTag.substring(_pointPos + 1);
                } else if (_tmpTag.indexOf('by:') != -1) {
                    // by body

                    _pointPos = _tmpTag.indexOf(':');
                    lrcData.byBody = _tmpTag.substring(_pointPos + 1);
                } else if (_tmpTag.indexOf('offset:') != -1) {
                    // offset

                    _pointPos = _tmpTag.indexOf(':');
                    lrcData.offset = _tmpTag.substring(_pointPos + 1);
                } else {
                    // 歌词时间标签,添加歌词到列表

                    _tmpTag = _tmpTag.indexOf('.') != -1 ? _tmpTag : _tmpTag + '.00';
                    _rSubstr = _rSubstr.trim();

                    let _t = parseInt(playTime2ms(_tmpTag) - lrcData.offset, 10);
                    _tmpTag = ms2playTime(_t);

                    if (_rSubstr) {
                        lrcList.push({ time: _t, context: _rSubstr });
                        preTime = _tmpTag;
                    }
                }
            }
        } else {
            lrcList.push({ time: preTime || 0, context: _rSubstr });
        }
    });

    lrcList.sort((item1, item2) => {
        return item1.time - item2.time;
    });

    return lrcList;
}

module.exports = {
    parseLyric,
    playTime2ms,
    ms2playTime
};
