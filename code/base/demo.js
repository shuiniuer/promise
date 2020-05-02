const Promise = require('./promise');

let p = new Promise((resolve, reject) => {
    setTimeout(()=>{
        resolve(1);
    },2000);
    // resolve(1);
});
p.then(val => {
    console.log('resolve', val);
}, reason => {
    console.log('reject', reason);
});