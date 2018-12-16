const store = require('../../store/index');

Page(
    store.createPage({
        onLoad(options) {
            console.log(options);
        }
    })
);
